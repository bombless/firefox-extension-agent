import fs from "node:fs/promises";
import path from "node:path";

export async function createWorkspaceGuard(workspace) {
  const root = await fs.realpath(workspace);

  async function resolveSafePath(requestedPath, { mustExist = true } = {}) {
    if (typeof requestedPath !== "string" || requestedPath.length === 0) {
      throw new TypeError("path must be a non-empty string");
    }

    const relative = requestedPath.replace(/^[/\\]+/, "");
    const candidate = path.resolve(root, relative);

    if (!isInside(root, candidate)) {
      throw new Error("Path escapes workspace");
    }

    if (mustExist) {
      const real = await fs.realpath(candidate);
      assertInside(root, real);
      return real;
    }

    const parentReal = await fs.realpath(path.dirname(candidate));
    assertInside(root, parentReal);
    return path.join(parentReal, path.basename(candidate));
  }

  return Object.freeze({
    root,
    resolveSafePath
  });
}

function assertInside(root, target) {
  if (!isInside(root, target)) {
    throw new Error("Path escapes workspace");
  }
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}
