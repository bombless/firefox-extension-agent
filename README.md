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
