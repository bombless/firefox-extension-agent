(() => {
  "use strict";

  const TOOL_PROMPT = `You have access to external tools.

When you need to use a tool, output a tool call using exactly this format:
@actions[{"id":"a1","protocol_version":1,"tool":"TOOL_NAME","params":{...}}]

You may output multiple actions in one @actions[...] block.

Available tools:

1. list_directory
   params: {"path":"string"}

2. read_file
   params: {"path":"string"}

3. write_file
   params: {"path":"string","content":"string"}

4. replace_file
   params: {"path":"string","content":"string"}

After emitting @actions[...], stop and wait for the tool results.
Tool results will be provided as a new user message using @tool_results[...].
Do not fabricate tool results.
`;

  const DEBUG = true;
  const ACTION_DEBOUNCE_MS = 500;
  const MAX_ACTION_ROUNDS = 50;
  const executedActions = new Set();
  let actionRound = 0;
  let debounceTimer = null;
  let lastConversationText = "";

  const log = (...args) => {
    if (DEBUG) console.debug("[fx-agent]", ...args);
  };

  function isGeminiPage() {
    return location.hostname === "gemini.google.com" &&
      location.pathname.startsWith("/app");
  }

  function injectToolPrompt() {
    const composer = GeminiAdapter.getComposer();
    if (!composer) {
      log("composer not found");
      return;
    }

    GeminiAdapter.appendToComposer(TOOL_PROMPT);
    composer.focus();
    log("tool instructions injected");
  }

  async function handleActionBlocks(text) {
    if (actionRound >= MAX_ACTION_ROUNDS) {
      log("maximum action rounds exceeded");
      return;
    }

    const blocks = AgentProtocol.extractActionBlocks(text);
    for (const block of blocks) {
      const freshActions = block.actions.filter((action) => {
        if (!action || typeof action !== "object") return false;
        const key = action.id
          ? "id:" + String(action.id)
          : AgentProtocol.stableActionKey(action);
        if (executedActions.has(key)) return false;
        executedActions.add(key);
        return true;
      });

      if (freshActions.length === 0) continue;

      actionRound += 1;
      log("action detected", freshActions);

      const response = await browser.runtime.sendMessage({
        type: "execute_actions",
        actions: freshActions
      });

      if (!response?.ok) {
        log("runner unavailable", response?.error);
        await injectToolResults([{
          id: "runner-error-" + Date.now(),
          tool: "runtime",
          ok: false,
          error: response?.error || {
            type: "RUNNER_ERROR",
            message: "Runner unavailable"
          }
        }]);
        return;
      }

      await injectToolResults(response.payload.results || []);
      return;
    }
  }

  async function injectToolResults(results) {
    const text = AgentProtocol.makeToolResultsPrompt(results);
    GeminiAdapter.appendToComposer(text);
    GeminiAdapter.submitComposer();
    log("tool results injected and submitted");
  }

  function scheduleScan() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const latest = GeminiAdapter.getLatestModelText();
      if (!latest || latest === lastConversationText) return;
      lastConversationText = latest;
      void handleActionBlocks(latest);
    }, ACTION_DEBOUNCE_MS);
  }

  function startObserver() {
    const conversation = GeminiAdapter.getConversation();
    const observer = new MutationObserver(scheduleScan);
    observer.observe(conversation, {
      subtree: true,
      childList: true,
      characterData: true
    });
    log("conversation observer started");
  }

  window.addEventListener("keydown", (event) => {
    if (!isGeminiPage()) return;
    if (event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === "y") {
      event.preventDefault();
      event.stopPropagation();
      log("Ctrl+Y");
      injectToolPrompt();
    }
  }, true);

  if (isGeminiPage()) {
    log("initialized");
    startObserver();
  }
})();
