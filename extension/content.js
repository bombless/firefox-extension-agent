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

GitHub tools (available when the runner has GITHUB_TOKEN configured):

5. github_create_repository
   params: {"name":"string","description":"string","private":"boolean","auto_init":"boolean"}

6. github_get_repository
   params: {"repository":"owner/name"}

7. github_list_files
   params: {"repository":"owner/name","ref":"string"}

8. github_read_file
   params: {"repository":"owner/name","path":"string","ref":"string"}

9. github_create_file
   params: {"repository":"owner/name","path":"string","content":"string","message":"string","branch":"string"}

10. github_update_file
    params: {"repository":"owner/name","path":"string","content":"string","message":"string","sha":"string","branch":"string"}

11. github_delete_file
    params: {"repository":"owner/name","path":"string","message":"string","sha":"string","branch":"string"}

12. github_create_branch
    params: {"repository":"owner/name","branch":"string","from":"string"}

13. github_create_pull_request
    params: {"repository":"owner/name","title":"string","body":"string","head":"string","base":"string","draft":"boolean"}

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
    if (DEBUG) console.debug("[fx-agent/content]", ...args);
  };

  function isGeminiPage() {
    return location.hostname === "gemini.google.com" &&
      location.pathname.startsWith("/app");
  }

  async function injectToolPrompt() {
    if (!isGeminiPage()) {
      log("not a Gemini app page", location.href);
      return { ok: false, error: "NOT_GEMINI_APP" };
    }

    const composer = GeminiAdapter.getComposer();
    if (!composer) {
      log("composer not found", location.href);
      log("composer candidates", GeminiAdapter.COMPOSER_SELECTORS);
      return { ok: false, error: "COMPOSER_NOT_FOUND" };
    }

    const selector = GeminiAdapter.getComposerSelector
      ? GeminiAdapter.getComposerSelector()
      : "unknown";
    log("composer found", { selector, tag: composer.tagName });

    const before = GeminiAdapter.getComposerText
      ? GeminiAdapter.getComposerText()
      : "";
    GeminiAdapter.appendToComposer(TOOL_PROMPT);
    composer.focus();

    const after = GeminiAdapter.getComposerText
      ? GeminiAdapter.getComposerText()
      : "";
    log("tool instructions injected", {
      beforeLength: before.length,
      afterLength: after.length,
      added: after.length >= before.length
    });

    return { ok: true, selector, beforeLength: before.length, afterLength: after.length };
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

      try {
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
      } catch (error) {
        log("runtime message failed", error);
        await injectToolResults([{
          id: "runtime-message-error-" + Date.now(),
          tool: "runtime",
          ok: false,
          error: {
            type: "RUNTIME_MESSAGE_ERROR",
            message: error instanceof Error ? error.message : String(error)
          }
        }]);
      }
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
    if (!conversation) {
      log("conversation container not found; observer not started");
      return;
    }

    const observer = new MutationObserver(scheduleScan);
    observer.observe(conversation, {
      subtree: true,
      childList: true,
      characterData: true
    });
    log("conversation observer started");
  }

  browser.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "inject_tool_prompt") return undefined;
    log("inject request received");
    return injectToolPrompt();
  });

  window.addEventListener("keydown", (event) => {
    if (!isGeminiPage()) return;
    if (event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey &&
        event.key.toLowerCase() === "y") {
      event.preventDefault();
      event.stopPropagation();
      log("Ctrl+Y fallback");
      void injectToolPrompt();
    }
  }, true);

  if (isGeminiPage()) {
    log("initialized", location.href);
    startObserver();
  }
})();