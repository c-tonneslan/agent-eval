import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type { Tool } from "./index.js";

export const readFileTool: Tool = {
  name: "read_file",
  description: "Read the contents of a file.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "The absolute path to read" },
    },
    required: ["path"],
  },
};

export const writeFileTool: Tool = {
  name: "write_file",
  description: "Write content to a file, creating parent directories as needed.",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "The absolute path to write to" },
      content: { type: "string", description: "The content to write" },
    },
    required: ["path", "content"],
  },
};

export async function executeReadFile(
  input: Record<string, unknown>
): Promise<string> {
  const path = input.path as string;
  const content = await readFile(path, "utf-8");
  return content;
}

export async function executeWriteFile(
  input: Record<string, unknown>
): Promise<string> {
  const path = input.path as string;
  const content = input.content as string;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf-8");
  return `Written ${content.length} bytes to ${path}`;
}
