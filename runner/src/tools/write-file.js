import fs from "node:fs/promises";
import path from "node:path";

export function createWriteFileTool(workspaceGuard) {
  return async ({ path: requestedPath, content }) => {
    if (typeof content !== "string") throw new TypeError("content must be a string");

    const file = await workspaceGuard.resolveSafePath(requestedPath, { mustExist: false });
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, { encoding: "utf8", flag: "wx" });

    return {
      path: requestedPath,
      bytes: Buffer.byteLength(content, "utf8")
    };
  };
}
