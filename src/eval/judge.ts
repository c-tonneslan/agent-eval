import Anthropic from "@anthropic-ai/sdk";
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { Trajectory } from "../agent.js";
import type { Task } from "../tasks/types.js";

const client = new Anthropic();

const JUDGE_SYSTEM = `You are an expert evaluator assessing AI agent performance on tasks.

Your job is to score how well an agent completed a task, on a scale of 1-5:

5 - Perfect: Correctly completed the task, used appropriate tools, answered accurately
4 - Good: Mostly correct with minor issues (small errors, slightly wrong format)
3 - Partial: Made a reasonable attempt but significant gaps or errors
2 - Poor: Made minimal useful progress, or answered without using required tools
1 - Failed: Did not attempt the task or produced completely wrong output

Respond ONLY with a JSON object in this exact format:
{"score": <1-5>, "reasoning": "<1-2 sentence explanation>", "failure_mode": "<hallucination|tool_error|wrong_answer|format_error|none>"}`;

export interface JudgeOutput {
  score: number;
  reasoning: string;
  failureMode: string;
}

export async function judgeTrajectory(
  task: Task,
  trajectory: Trajectory
): Promise<JudgeOutput> {
  const stepsText = trajectory.steps
    .map((s, i) => {
      const tools = s.toolCalls
        ?.map(
          (c) =>
            `  Tool: ${c.name}(${JSON.stringify(c.input).slice(0, 200)})\n  Result: ${
              trajectory.steps[i]?.toolResults
                ?.find((r) => r.toolCallId === c.id)
                ?.output?.toString()
                .slice(0, 500) ?? "error"
            }`
        )
        .join("\n");
      return `Step ${i + 1}:\n${s.content.slice(0, 300)}${tools ? "\n" + tools : ""}`;
    })
    .join("\n\n");

  const prompt = `Task ID: ${task.id}
Category: ${task.category}

Task Description:
${task.description}

Rubric (if applicable):
${task.rubric ?? task.notes ?? "N/A"}

Agent Trajectory:
${stepsText}

Final Answer:
${trajectory.finalAnswer ?? "(no answer)"}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: JUDGE_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    const parsed = JSON.parse(text);
    return {
      score: Math.min(5, Math.max(1, Number(parsed.score))),
      reasoning: String(parsed.reasoning ?? ""),
      failureMode: String(parsed.failure_mode ?? "none"),
    };
  } catch {
    // Try to extract score from text
    const scoreMatch = text.match(/"score":\s*(\d)/);
    return {
      score: scoreMatch ? parseInt(scoreMatch[1]) : 3,
      reasoning: text.slice(0, 200),
      failureMode: "none",
    };
  }
}

// Run judge scoring over all saved trajectories that need it
export async function runJudgePass(resultsDir: string): Promise<void> {
  const files = await readdir(resultsDir);
  const trajectoryFiles = files.filter(
    (f) => f.endsWith("-trajectory.json") && !f.includes("judge")
  );

  console.log(`Running LLM judge on ${trajectoryFiles.length} trajectories...`);

  for (const file of trajectoryFiles) {
    const trajPath = join(resultsDir, file);
    const taskResultPath = join(resultsDir, file.replace("-trajectory", "-result"));
    const judgeOutputPath = join(resultsDir, file.replace("-trajectory", "-judge"));

    const traj: Trajectory = JSON.parse(await readFile(trajPath, "utf-8"));

    // Load the task result to get the task info
    let taskResult;
    try {
      taskResult = JSON.parse(await readFile(taskResultPath, "utf-8"));
    } catch {
      console.log(`  Skipping ${file} (no result file)`);
      continue;
    }

    if (taskResult.scorer !== "judge") {
      // Still run judge on failed non-judge tasks for analysis
      if (taskResult.passed) {
        console.log(`  Skipping ${file} (passed, non-judge task)`);
        continue;
      }
    }

    console.log(`  Judging ${traj.taskId}...`);
    const judgment = await judgeTrajectory(taskResult.task, traj);
    await writeFile(judgeOutputPath, JSON.stringify(judgment, null, 2));
    console.log(`    Score: ${judgment.score}/5 — ${judgment.reasoning.slice(0, 80)}`);

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }
}
