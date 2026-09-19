import http from "node:http";
import process from "node:process";
import { createWorkspaceGuard } from "./security.js";
import {
  PROTOCOL_VERSION,
  validateExecuteRequest,
  okResult,
  errorResult
} from "./protocol.js";
import { createToolRegistry, publicToolDefinitions } from "./tools/index.js";

const DEFAULT_PORT = 8765;
const HOST = "127.0.0.1";

function parseArgs(argv) {
  const options = {
    workspace: null,
    port: DEFAULT_PORT
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--workspace") options.workspace = argv[++i];
    else if (argv[i] === "--port") options.port = Number(argv[++i]);
  }

  if (!options.workspace) {
    throw new Error("Missing --workspace <path>");
  }

  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error("Invalid --port");
  }

  return options;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workspaceGuard = await createWorkspaceGuard(options.workspace);
  const registry = createToolRegistry(workspaceGuard);

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        sendJson(res, 204, {});
        return;
      }

      if (req.method === "GET" && req.url === "/health") {
        sendJson(res, 200, { ok: true, version: "0.1.0", protocol_version: PROTOCOL_VERSION });
        return;
      }

      if (req.method === "GET" && req.url === "/tools") {
        sendJson(res, 200, { protocol_version: PROTOCOL_VERSION, tools: publicToolDefinitions(registry) });
        return;
      }

      if (req.method === "POST" && req.url === "/execute") {
        const body = await readJson(req);
        const actions = validateExecuteRequest(body);
        const results = [];

        for (const action of actions) {
          try {
            if (!action || typeof action !== "object") {
              throw new TypeError("Action must be an object");
            }
            if (typeof action.tool !== "string" || !registry[action.tool]) {
              throw new Error("Unknown tool: " + String(action.tool));
            }
            const params = action.params && typeof action.params === "object"
              ? action.params
              : {};
            const result = await registry[action.tool].execute(params);
            results.push(okResult(action, result));
          } catch (error) {
            results.push(errorResult(action, error));
          }
        }

        sendJson(res, 200, { protocol_version: PROTOCOL_VERSION, results });
        return;
      }

      sendJson(res, 404, { error: { type: "NOT_FOUND", message: "Not found" } });
    } catch (error) {
      sendJson(res, 400, {
        error: {
          type: "REQUEST_ERROR",
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
  });

  server.listen(options.port, HOST, () => {
    console.log("[runner] server started on " + HOST + ":" + options.port);
    console.log("[runner] workspace=" + workspaceGuard.root);
  });
}

main().catch((error) => {
  console.error("[runner] failed to start:", error);
  process.exitCode = 1;
});
