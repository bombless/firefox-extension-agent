import fs from "node:fs/promises";

export function createListDirectoryTool(workspaceGuard) {
  return async ({ path }) => {
    const directory = await workspaceGuard.resolveSafePath(path);
    const entries = await fs.readdir(directory, { withFileTypes: true });

    return {
      path,
      entries: entries
        .map((entry) => ({
          name: entry.name,
          type: entry.isDirectory()
            ? "directory"
            : entry.isFile()
              ? "file"
              : entry.isSymbolicLink()
                ? "symlink"
                : "other"
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    };
  };
}
