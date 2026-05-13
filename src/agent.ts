import Anthropic from "@anthropic-ai/sdk";
import { Tool, ToolCall, ToolResult, executeToolCall } from "./tools/index.js";

const client = new Anthropic();

export interface Step {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  elapsedMs: number;
}

export interface Trajectory {
  taskId: string;
  model: string;
  steps: Step[];
  finalAnswer: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  totalElapsedMs: number;
  completedAt: string;
  failureReason?: string;
}

const SYSTEM_PROMPT = `You are a capable agent that completes tasks by using tools.

When given a task:
1. Think about what tools you need to use
2. Use tools to gather information or take actions
3. When you have enough information, give your final answer

For your final answer, respond with:
FINAL ANSWER: <your answer here>

Be concise and precise. Don't use tools you don't need.`;

export async function runAgent(
  taskId: string,
  taskDescription: string,
  tools: Tool[],
  maxSteps = 10,
  model = "claude-sonnet-4-6"
): Promise<Trajectory> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: taskDescription },
  ];

  const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  const steps: Step[] = [];
  let modelUsed = model;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;
  let totalElapsedMs = 0;
  let finalAnswer: string | null = null;
  let failureReason: string | undefined;

  for (let i = 0; i < maxSteps; i++) {
    const stepStart = Date.now();

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: 2048,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
        messages,
      });
    } catch (err) {
      failureReason = `API error: ${err}`;
      break;
    }

    const elapsed = Date.now() - stepStart;
    const usage = response.usage as Anthropic.Usage & {
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };

    const inputTokens = usage.input_tokens;
    const outputTokens = usage.output_tokens;
    const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
    const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCacheReadTokens += cacheReadTokens;
    totalCacheWriteTokens += cacheWriteTokens;
    totalElapsedMs += elapsed;

    // Extract text content and tool calls from the response
    const textParts: string[] = [];
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textParts.push(block.text);
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    const assistantText = textParts.join("\n");

    const step: Step = {
      role: "assistant",
      content: assistantText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      elapsedMs: elapsed,
    };
    steps.push(step);

    // Add assistant message to conversation
    messages.push({ role: "assistant", content: response.content });

    // Check for final answer in text
    const finalMatch = assistantText.match(/FINAL ANSWER:\s*([\s\S]+)/i);
    if (finalMatch && response.stop_reason !== "tool_use") {
      finalAnswer = finalMatch[1].trim();
      break;
    }

    // If no tool calls and no final answer, treat entire response as final answer
    if (toolCalls.length === 0 && response.stop_reason === "end_turn") {
      finalAnswer = assistantText.trim();
      break;
    }

    // Execute tool calls
    if (toolCalls.length > 0) {
      const toolResults: ToolResult[] = [];
      const toolResultContent: Anthropic.ToolResultBlockParam[] = [];

      for (const call of toolCalls) {
        const result = await executeToolCall(call, tools);
        toolResults.push(result);
        toolResultContent.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: result.error
            ? `Error: ${result.error}`
            : String(result.output),
        });
      }

      step.toolResults = toolResults;
      messages.push({ role: "user", content: toolResultContent });
    }

    if (response.stop_reason === "max_tokens") {
      failureReason = "max_tokens";
      break;
    }
  }

  if (!finalAnswer && !failureReason) {
    failureReason = "max_steps";
  }

  return {
    taskId,
    model: modelUsed,
    steps,
    finalAnswer,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheWriteTokens,
    totalElapsedMs,
    completedAt: new Date().toISOString(),
    failureReason,
  };
}
