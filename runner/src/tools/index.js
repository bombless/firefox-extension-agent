import { createListDirectoryTool } from "./list-directory.js";
import { createReadFileTool } from "./read-file.js";
import { createWriteFileTool } from "./write-file.js";
import { createReplaceFileTool } from "./replace-file.js";

export function createToolRegistry(workspaceGuard) {
  const tools = {
    list_directory: {
      description: "List files in a directory",
      params: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"]
      },
      execute: createListDirectoryTool(workspaceGuard)
    },
    read_file: {
      description: "Read a UTF-8 text file",
      params: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"]
      },
      execute: createReadFileTool(workspaceGuard)
    },
    write_file: {
      description: "Create a new UTF-8 text file",
      params: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"]
      },
      execute: createWriteFileTool(workspaceGuard)
    },
    replace_file: {
      description: "Replace an existing UTF-8 text file",
      params: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"]
      },
      execute: createReplaceFileTool(workspaceGuard)
    }
  };

  return Object.freeze(tools);
}

export function publicToolDefinitions(registry) {
  return Object.entries(registry).map(([name, tool]) => ({
    name,
    description: tool.description,
    params: tool.params
  }));
}
