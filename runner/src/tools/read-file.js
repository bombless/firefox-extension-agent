import fs from "node:fs/promises";

export function createReadFileTool(workspaceGuard) {
  return async ({ path }) => {
    const file = await workspaceGuard.resolveSafePath(path);
    const stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error("Path is not a file");

    return {
      path,
      content: await fs.readFile(file, "utf8")
    };
  };
}
