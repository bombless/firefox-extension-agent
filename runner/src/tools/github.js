import { GitHubClient, decodeGitHubContent } from "../github/client.js";

export function createGitHubTools() {
  const client = new GitHubClient();

  return {
    github_create_repository: {
      description: "Create a GitHub repository for the authenticated user",
      params: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          private: { type: "boolean" },
          auto_init: { type: "boolean" }
        },
        required: ["name"]
      },
      execute: async (params) => {
        const repo = await client.createRepository(params);
        return {
          full_name: repo.full_name,
          html_url: repo.html_url,
          default_branch: repo.default_branch
        };
      }
    },

    github_get_repository: {
      description: "Get metadata for a GitHub repository",
      params: {
        type: "object",
        properties: { repository: { type: "string" } },
        required: ["repository"]
      },
      execute: async ({ repository }) => {
        const repo = await client.getRepository(repository);
        return {
          full_name: repo.full_name,
          private: repo.private,
          default_branch: repo.default_branch,
          html_url: repo.html_url,
          description: repo.description
        };
      }
    },

    github_list_files: {
      description: "List files in a GitHub repository tree",
      params: {
        type: "object",
        properties: {
          repository: { type: "string" },
          ref: { type: "string" }
        },
        required: ["repository"]
      },
      execute: async ({ repository, ref }) => {
        const tree = await client.listFiles(repository, ref || "HEAD");
        return {
          truncated: Boolean(tree.truncated),
          entries: (tree.tree || [])
            .filter((entry) => entry.type === "blob" || entry.type === "tree")
            .map((entry) => ({
              path: entry.path,
              type: entry.type,
              sha: entry.sha,
              size: entry.size
            }))
        };
      }
    },

    github_read_file: {
      description: "Read a UTF-8 text file from a GitHub repository",
      params: {
        type: "object",
        properties: {
          repository: { type: "string" },
          path: { type: "string" },
          ref: { type: "string" }
        },
        required: ["repository", "path"]
      },
      execute: async ({ repository, path, ref }) => {
        const payload = await client.readFile(repository, path, ref);
        return {
          repository,
          path,
          ref: ref || null,
          sha: payload.sha,
          content: decodeGitHubContent(payload)
        };
      }
    },

    github_create_file: {
      description: "Create a new file in a GitHub repository",
      params: {
        type: "object",
        properties: {
          repository: { type: "string" },
          path: { type: "string" },
          content: { type: "string" },
          message: { type: "string" },
          branch: { type: "string" }
        },
        required: ["repository", "path", "content", "message"]
      },
      execute: async (params) => {
        const payload = await client.createFile(params.repository, params);
        return {
          path: params.path,
          commit_sha: payload.commit?.sha || null,
          content_sha: payload.content?.sha || null,
          html_url: payload.content?.html_url || null
        };
      }
    },

    github_update_file: {
      description: "Update an existing file in a GitHub repository",
      params: {
        type: "object",
        properties: {
          repository: { type: "string" },
          path: { type: "string" },
          content: { type: "string" },
          message: { type: "string" },
          sha: { type: "string" },
          branch: { type: "string" }
        },
        required: ["repository", "path", "content", "message", "sha"]
      },
      execute: async (params) => {
        const payload = await client.updateFile(params.repository, params);
        return {
          path: params.path,
          commit_sha: payload.commit?.sha || null,
          content_sha: payload.content?.sha || null,
          html_url: payload.content?.html_url || null
        };
      }
    },

    github_delete_file: {
      description: "Delete a file from a GitHub repository",
      params: {
        type: "object",
        properties: {
          repository: { type: "string" },
          path: { type: "string" },
          message: { type: "string" },
          sha: { type: "string" },
          branch: { type: "string" }
        },
        required: ["repository", "path", "message", "sha"]
      },
      execute: async (params) => {
        const payload = await client.deleteFile(params.repository, params);
        return {
          path: params.path,
          commit_sha: payload.commit?.sha || null
        };
      }
    },

    github_create_branch: {
      description: "Create a GitHub branch from an existing branch or commit",
      params: {
        type: "object",
        properties: {
          repository: { type: "string" },
          branch: { type: "string" },
          from: { type: "string" }
        },
        required: ["repository", "branch"]
      },
      execute: async (params) => {
        const payload = await client.createBranch(params.repository, params);
        return {
          ref: payload.ref,
          sha: payload.object?.sha || null
        };
      }
    },

    github_create_pull_request: {
      description: "Create a GitHub pull request",
      params: {
        type: "object",
        properties: {
          repository: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          head: { type: "string" },
          base: { type: "string" },
          draft: { type: "boolean" }
        },
        required: ["repository", "title", "head"]
      },
      execute: async (params) => {
        const payload = await client.createPullRequest(params.repository, params);
        return {
          number: payload.number,
          html_url: payload.html_url,
          state: payload.state
        };
      }
    }
  };
}
