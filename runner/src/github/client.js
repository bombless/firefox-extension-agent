const API_ROOT = "https://api.github.com";

export class GitHubClient {
  constructor(token = process.env.GITHUB_TOKEN) {
    if (!token) throw new Error("GITHUB_TOKEN is not configured");
    this.token = token;
  }

  async request(method, pathname, body) {
    const response = await fetch(API_ROOT + pathname, {
      method,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + this.token,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });

    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      const message = payload?.message || ("GitHub API HTTP " + response.status);
      const error = new Error(message);
      error.type = "GITHUB_API_ERROR";
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  getRepository(repository) {
    return this.request("GET", "/repos/" + encodeRepo(repository));
  }

  createRepository({ name, description = "", private: isPrivate = false, auto_init = true }) {
    return this.request("POST", "/user/repos", {
      name,
      description,
      private: Boolean(isPrivate),
      auto_init: Boolean(auto_init)
    });
  }

  async listFiles(repository, ref) {
    const treeRef = ref || (await this.getRepository(repository)).default_branch;
    return this.request(
      "GET",
      "/repos/" + encodeRepo(repository) + "/git/trees/" + encodeURIComponent(treeRef) + "?recursive=1"
    );
  }

  readFile(repository, path, ref) {
    const query = ref ? "?ref=" + encodeURIComponent(ref) : "";
    return this.request(
      "GET",
      "/repos/" + encodeRepo(repository) + "/contents/" + encodePath(path) + query
    );
  }

  createFile(repository, { path, content, message, branch }) {
    return this.request(
      "PUT",
      "/repos/" + encodeRepo(repository) + "/contents/" + encodePath(path),
      {
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        ...(branch ? { branch } : {})
      }
    );
  }

  updateFile(repository, { path, content, message, sha, branch }) {
    return this.request(
      "PUT",
      "/repos/" + encodeRepo(repository) + "/contents/" + encodePath(path),
      {
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        sha,
        ...(branch ? { branch } : {})
      }
    );
  }

  deleteFile(repository, { path, message, sha, branch }) {
    return this.request(
      "DELETE",
      "/repos/" + encodeRepo(repository) + "/contents/" + encodePath(path),
      {
        message,
        sha,
        ...(branch ? { branch } : {})
      }
    );
  }

  async createBranch(repository, { branch, from = "main" }) {
    const sha = from.match(/^[0-9a-f]{40}$/i)
      ? from
      : await this.getRepositoryBranchSha(repository, from);

    return this.request("POST", "/repos/" + encodeRepo(repository) + "/git/refs", {
      ref: "refs/heads/" + branch,
      sha
    });
  }

  async getRepositoryBranchSha(repository, ref) {
    const payload = await this.request(
      "GET",
      "/repos/" + encodeRepo(repository) + "/git/ref/heads/" + encodeURIComponent(ref)
    );
    return payload.object.sha;
  }

  createPullRequest(repository, { title, body = "", head, base = "main", draft = false }) {
    return this.request("POST", "/repos/" + encodeRepo(repository) + "/pulls", {
      title,
      body,
      head,
      base,
      draft: Boolean(draft)
    });
  }
}

function encodeRepo(repository) {
  const parts = String(repository).split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new TypeError("repository must be owner/name");
  }
  return parts.map(encodeURIComponent).join("/");
}

function encodePath(filePath) {
  return String(filePath).split("/").map(encodeURIComponent).join("/");
}

export function decodeGitHubContent(payload) {
  if (!payload || payload.encoding !== "base64" || typeof payload.content !== "string") {
    throw new Error("GitHub response did not contain base64 file content");
  }
  return Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
}
