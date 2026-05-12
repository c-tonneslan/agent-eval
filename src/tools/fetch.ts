import type { Tool } from "./index.js";

export const fetchTool: Tool = {
  name: "fetch",
  description:
    "Fetch the content of a URL. Returns the response body as text. For GitHub API requests, use https://api.github.com/...",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to fetch" },
      headers: {
        type: "object",
        description: "Optional HTTP headers to include",
        additionalProperties: { type: "string" },
      },
    },
    required: ["url"],
  },
};

const MAX_BODY_CHARS = 8000;

export async function executeFetch(
  input: Record<string, unknown>
): Promise<string> {
  const url = input.url as string;
  const headers = (input.headers as Record<string, string> | undefined) ?? {};

  // Add a default User-Agent so GitHub doesn't reject us
  const finalHeaders: Record<string, string> = {
    "User-Agent": "agent-eval/1.0",
    Accept: "application/json, text/plain, */*",
    ...headers,
  };

  const res = await fetch(url, { headers: finalHeaders });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();

  // Truncate large responses
  if (body.length > MAX_BODY_CHARS) {
    return body.slice(0, MAX_BODY_CHARS) + `\n...[truncated at ${MAX_BODY_CHARS} chars]`;
  }

  return body;
}
