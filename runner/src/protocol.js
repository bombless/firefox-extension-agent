export const PROTOCOL_VERSION = 1;

export function validateExecuteRequest(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object");
  }
  if (body.protocol_version !== undefined && body.protocol_version !== PROTOCOL_VERSION) {
    throw new Error("Unsupported protocol_version");
  }
  if (!Array.isArray(body.actions)) {
    throw new Error("actions must be an array");
  }
  return body.actions;
}

export function okResult(action, result) {
  return {
    id: action.id ?? null,
    tool: action.tool,
    ok: true,
    result
  };
}

export function errorResult(action, error) {
  return {
    id: action?.id ?? null,
    tool: action?.tool ?? null,
    ok: false,
    error: {
      type: error?.type || "TOOL_ERROR",
      message: error instanceof Error ? error.message : String(error?.message || error)
    }
  };
}
