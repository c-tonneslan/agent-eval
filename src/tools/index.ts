import { fetchTool, executeFetch } from "./fetch.js";
import { shellTool, executeShell } from "./shell.js";
import { readFileTool, executeReadFile } from "./files.js";
import { writeFileTool, executeWriteFile } from "./files.js";

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  output?: unknown;
  error?: string;
  elapsedMs: number;
}

export const TOOLS: Record<string, Tool> = {
  fetch: fetchTool,
  shell: shellTool,
  read_file: readFileTool,
  write_file: writeFileTool,
};

export function getTools(names: string[]): Tool[] {
  return names.map((n) => {
    const tool = TOOLS[n];
    if (!tool) throw new Error(`Unknown tool: ${n}`);
    return tool;
  });
}

export async function executeToolCall(
  call: ToolCall,
  tools: Tool[]
): Promise<ToolResult> {
  const start = Date.now();
  try {
    let output: unknown;
    switch (call.name) {
      case "fetch":
        output = await executeFetch(call.input);
        break;
      case "shell":
        output = await executeShell(call.input);
        break;
      case "read_file":
        output = await executeReadFile(call.input);
        break;
      case "write_file":
        output = await executeWriteFile(call.input);
        break;
      default:
        throw new Error(`No executor for tool: ${call.name}`);
    }
    return {
      toolCallId: call.id,
      toolName: call.name,
      output,
      elapsedMs: Date.now() - start,
    };
  } catch (err) {
    return {
      toolCallId: call.id,
      toolName: call.name,
      error: String(err),
      elapsedMs: Date.now() - start,
    };
  }
}
