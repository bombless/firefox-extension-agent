# Protocol

Protocol version: 1.

## Model → extension

The model emits a single JSON array after the literal prefix:

    @actions[{"id":"a1","protocol_version":1,"tool":"list_directory","params":{"path":"/"}}]

The extension waits until bracket matching finds a complete JSON value and JSON.parse succeeds. Streaming fragments are ignored until complete.

## Extension → runner

POST /execute to http://127.0.0.1:8765 with:

    {
      "protocol_version": 1,
      "actions": [
        {
          "id": "a1",
          "protocol_version": 1,
          "tool": "list_directory",
          "params": {"path": "/"}
        }
      ]
    }

## Runner → extension

    {
      "protocol_version": 1,
      "results": [
        {
          "id": "a1",
          "tool": "list_directory",
          "ok": true,
          "result": {
            "path": "/",
            "entries": []
          }
        }
      ]
    }

Errors use ok=false and include error.type and error.message.

## Extension → Gemini

Tool results are injected as a new user message using:

    @tool_results[{"id":"a1","tool":"list_directory","ok":true,"result":{...}}]

The model is instructed to treat this as runtime-provided data and never fabricate it.
