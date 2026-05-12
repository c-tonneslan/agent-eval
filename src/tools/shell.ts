import { exec } from "child_process";
import { promisify } from "util";
import type { Tool } from "./index.js";

const execAsync = promisify(exec);

export const shellTool: Tool = {
  name: "shell",
  description:
    "Execute a shell command. Use for running code, tests, or system commands. Commands run in the /tmp/agent-sandbox directory.",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string", description: "The shell command to run" },
    },
    required: ["command"],
  },
};

export async function executeShell(
  input: Record<string, unknown>
): Promise<string> {
  const command = input.command as string;

  // Run in a sandboxed tmp directory
  const { stdout, stderr } = await execAsync(command, {
    cwd: "/tmp/agent-sandbox",
    timeout: 15000,
    env: { ...process.env, HOME: "/tmp/agent-sandbox" },
  });

  const output = [stdout, stderr].filter(Boolean).join("\n").trim();
  return output || "(no output)";
}
