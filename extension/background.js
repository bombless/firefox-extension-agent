(() => {
  "use strict";

  const RUNNER_URL = "http://127.0.0.1:8765";
  const DEBUG = true;

  const log = (...args) => {
    if (DEBUG) console.debug("[fx-agent/background]", ...args);
  };

  async function executeActions(actions) {
    const response = await fetch(RUNNER_URL + "/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protocol_version: 1, actions })
    });

    if (!response.ok) {
      throw new Error("Runner returned HTTP " + response.status);
    }

    return response.json();
  }

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== "inject-tool-prompt") return;

    log("command received", command);
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
      });
      const tab = tabs[0];

      if (!tab?.id) {
        log("no active tab");
        return;
      }

      const response = await browser.tabs.sendMessage(tab.id, {
        type: "inject_tool_prompt"
      });
      log("content-script response", response);
    } catch (error) {
      log("command dispatch failed", error);
    }
  });

  browser.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "execute_actions") return undefined;

    log("sending action batch to runner", message.actions);

    return executeActions(message.actions)
      .then((payload) => ({ ok: true, payload }))
      .catch((error) => {
        log("runner error", error);
        return {
          ok: false,
          error: {
            type: "RUNNER_ERROR",
            message: error instanceof Error ? error.message : String(error)
          }
        };
      });
  });
})();