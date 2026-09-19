# firefox-extension-agent

A small experiment that gives Gemini Web a text-protocol based tool-use loop through a Firefox extension and a local Node.js runner.

Current implementation covers the MVP agent loop and workspace-sandboxed filesystem tools. GitHub tools are intentionally left for the next phase.

## Architecture

Gemini Web ↕ Firefox extension ↕ localhost Node.js runner ↕ local workspace

See docs/protocol.md for the wire protocol.

## Quick start

1. Start the runner:

   cd runner
   npm start -- --workspace ~/some/project

2. In Firefox open about:debugging → This Firefox → Load Temporary Add-on and select extension/manifest.json.

3. Open https://gemini.google.com/app.

4. Enter a task, press Ctrl+Y, review the injected tool instructions, and press Enter.

The first end-to-end target is a list_directory action followed by a @tool_results[...] message.

## Safety

The runner only binds to 127.0.0.1, has no shell/command tool, and resolves filesystem paths against the configured workspace. Existing symlinks are checked with realpath; new files are checked through their real parent directory.

This is an experimental local automation bridge. Do not expose the runner beyond localhost or put secrets in Gemini prompts.


## Current MVP

Implemented:

- Firefox Manifest V3 extension restricted to Gemini Web.
- Ctrl+Y tool-instruction injection without auto-submitting the user's first prompt.
- Gemini DOM adapter with textarea/contenteditable support.
- MutationObserver-based streaming action detection with JSON bracket matching.
- Action deduplication and a 50-round safety limit.
- Firefox background bridge to 127.0.0.1:8765.
- Local workspace-sandboxed list/read/write/replace filesystem tools.
- GitHub REST tools gated by GITHUB_TOKEN.
- Protocol and workspace-security tests.

GitHub tools are disabled automatically when GITHUB_TOKEN is not set.

## GitHub setup

Set a token only in the runner environment:

    export GITHUB_TOKEN=...
    cd runner
    npm start -- --workspace ~/some/project

The token is not put into the extension or Gemini prompt. See docs/github.md.

## Tests

    cd runner
    npm test

The tests cover action extraction edge cases and workspace traversal/symlink escape.
