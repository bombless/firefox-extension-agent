(() => {
  "use strict";

  const RUNNER_URL = "http://127.0.0.1:8765";
  const DEBUG = true;

  const log = (...args) => {
    if (DEBUG) console.debug("[fx-agent]", ...args);
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
