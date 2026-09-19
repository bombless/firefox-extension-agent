(() => {
  "use strict";

  const COMPOSER_SELECTORS = [
    'rich-textarea [contenteditable="true"]',
    'div.ql-editor[contenteditable="true"]',
    '[aria-label="Enter a prompt here"]',
    'textarea',
    '[contenteditable="true"][role="textbox"]'
  ];

  const ASSISTANT_SELECTORS = [
    "model-response",
    ".model-response",
    "response-container",
    ".response-container",
    ".presented-response-container",
    '[aria-label="Gemini response"]',
    '[data-message-author-role="assistant"]',
    '[data-message-author-role="model"]',
    'article[data-author="assistant"]'
  ];

  function isVisible(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0;
  }

  function getComposer() {
    for (const selector of COMPOSER_SELECTORS) {
      const nodes = document.querySelectorAll(selector);
      for (const node of nodes) {
        if (isVisible(node)) return node;
      }
    }
    return null;
  }

  function readComposerText(composer) {
    if (!composer) return "";
    return (composer.value ?? composer.innerText ?? composer.textContent ?? "")
      .replace(/\u00a0/g, " ")
      .trim();
  }

  function setComposerText(text) {
    const composer = getComposer();
    if (!composer) throw new Error("Gemini composer not found");

    composer.focus();

    if ("value" in composer && composer.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(composer, text);
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(composer);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("insertText", false, text);
      if (readComposerText(composer) !== text) {
        composer.textContent = text;
      }
    }

    composer.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: text
    }));
    composer.dispatchEvent(new Event("change", { bubbles: true }));
    return composer;
  }

  function appendToComposer(text) {
    const composer = getComposer();
    if (!composer) throw new Error("Gemini composer not found");

    const current = readComposerText(composer);
    const next = current ? current + "\n\n" + text : text;
    return setComposerText(next);
  }

  function submitComposer() {
    const composer = getComposer();
    if (!composer) throw new Error("Gemini composer not found");

    composer.focus();
    composer.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    }));
    composer.dispatchEvent(new KeyboardEvent("keyup", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true
    }));
  }

  function getConversation() {
    return document.querySelector("main") ||
      document.querySelector('[role="main"]') ||
      document.body;
  }

  function getLatestModelText() {
    const nodes = [];
    for (const selector of ASSISTANT_SELECTORS) {
      for (const node of document.querySelectorAll(selector)) {
        if (isVisible(node) && !nodes.includes(node)) nodes.push(node);
      }
    }

    const candidate = nodes[nodes.length - 1];
    if (candidate) return candidate.innerText || candidate.textContent || "";

    return "";
  }

  globalThis.GeminiAdapter = Object.freeze({
    getComposer,
    setComposerText,
    appendToComposer,
    submitComposer,
    getConversation,
    getLatestModelText,
    readComposerText
  });
})();
