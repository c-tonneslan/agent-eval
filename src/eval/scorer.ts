import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type { Task, EvalResult, FailureMode } from "../tasks/types.js";
import type { Trajectory, Step } from "../agent.js";

const execAsync = promisify(exec);

export async function scoreResult(
  task: Task,
  trajectory: Trajectory
): Promise<EvalResult> {
  const answer = trajectory.finalAnswer ?? "";
  const failureMode = detectFailureMode(task, trajectory);

  // No answer at all
  if (!trajectory.finalAnswer) {
    return {
      taskId: task.id,
      category: task.category,
      passed: false,
      score: 0,
      failureMode: failureMode ?? "no_answer",
    };
  }

  let passed = false;
  let score = 0;

  switch (task.scorer) {
    case "exact":
      passed =
        answer.toLowerCase().trim() === (task.expected ?? "").toLowerCase().trim();
      score = passed ? 1 : 0;
      break;

    case "contains":
      passed = answer
        .toLowerCase()
        .includes((task.expected ?? "").toLowerCase());
      score = passed ? 1 : 0;
      break;

    case "regex":
      if (task.expectedPattern) {
        // Try to match the pattern against just the answer (stripped)
        const re = new RegExp(task.expectedPattern, "i");
        // Extract the first word-boundary match or the trimmed answer
        const trimmed = answer.trim().split(/\s+/)[0].replace(/[.,!?]$/, "");
        passed = re.test(trimmed) || re.test(answer.trim());
        score = passed ? 1 : 0;
      }
      break;

    case "code_test":
      ({ passed, score } = await runCodeTest(task));
      break;

    case "judge":
      // Judge scoring happens separately; here we just check if an answer exists
      passed = answer.length > 10;
      score = passed ? 0.5 : 0; // placeholder until judge runs
      break;
  }

  return {
    taskId: task.id,
    category: task.category,
    passed,
    score,
    failureMode: passed ? undefined : failureMode,
  };
}

async function runCodeTest(
  task: Task
): Promise<{ passed: boolean; score: number }> {
  try {
    if (!task.testCommand) return { passed: false, score: 0 };
    await execAsync(task.testCommand, { timeout: 30000 });
    return { passed: true, score: 1 };
  } catch {
    return { passed: false, score: 0 };
  }
}

export async function setupTaskFiles(task: Task): Promise<void> {
  if (!task.setupFiles) return;
  for (const [path, content] of Object.entries(task.setupFiles)) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf-8");
  }
}

function detectFailureMode(task: Task, trajectory: Trajectory): FailureMode | undefined {
  if (trajectory.failureReason === "max_steps") return "max_steps";
  if (trajectory.failureReason === "max_tokens") return "max_tokens";
  if (trajectory.failureReason?.startsWith("API error")) return "api_error";

  const usedTools = trajectory.steps.some((s) => s.toolCalls && s.toolCalls.length > 0);
  const hasToolErrors = trajectory.steps.some(
    (s) => s.toolResults?.some((r) => r.error)
  );

  // Check if answer looks like a hallucination (didn't use tools but gave an answer)
  if (!usedTools && task.tools.length > 0 && trajectory.finalAnswer) {
    return "hallucination";
  }

  if (hasToolErrors) return "tool_error";

  return "wrong_answer";
}
