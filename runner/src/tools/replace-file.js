import fs from "node:fs/promises";

export function createReplaceFileTool(workspaceGuard) {
  return async ({ path: requestedPath, content }) => {
    if (typeof content !== "string") throw new TypeError("content must be a string");

    const file = await workspaceGuard.resolveSafePath(requestedPath);
    const stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error("Path is not a file");

    await fs.writeFile(file, content, "utf8");

    return {
      path: requestedPath,
      bytes: Buffer.byteLength(content, "utf8")
    };
  };
}
