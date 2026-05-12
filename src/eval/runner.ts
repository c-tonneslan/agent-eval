import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { ALL_TASKS } from "../tasks/index.js";
import type { Task } from "../tasks/types.js";
import { runAgent } from "../agent.js";
import { scoreResult, setupTaskFiles } from "./scorer.js";
import { judgeTrajectory } from "./judge.js";
import { getTools } from "../tools/index.js";

const RESULTS_DIR = new URL("../../results", import.meta.url).pathname;

interface RunOptions {
  taskIds?: string[];
  categories?: string[];
  maxTasks?: number;
}

async function runEval(options: RunOptions = {}): Promise<void> {
  await mkdir(RESULTS_DIR, { recursive: true });
  await mkdir("/tmp/agent-sandbox", { recursive: true });

  let tasks = ALL_TASKS;

  if (options.taskIds) {
    tasks = tasks.filter((t) => options.taskIds!.includes(t.id));
  } else if (options.categories) {
    tasks = tasks.filter((t) =>
      options.categories!.includes(t.category)
    );
  }

  if (options.maxTasks) {
    tasks = tasks.slice(0, options.maxTasks);
  }

  console.log(`\nRunning ${tasks.length} tasks...\n`);
  console.log("=".repeat(60));

  const summary: Record<string, { total: number; passed: number; scores: number[] }> = {
    web: { total: 0, passed: 0, scores: [] },
    code: { total: 0, passed: 0, scores: [] },
    multistep: { total: 0, passed: 0, scores: [] },
  };

  for (const task of tasks) {
    console.log(`\n[${task.id}] ${task.category.toUpperCase()}`);
    console.log(
      `Task: ${task.description.slice(0, 100)}${task.description.length > 100 ? "..." : ""}`
    );

    // Set up any required files
    try {
      await setupTaskFiles(task);
    } catch (err) {
      console.error(`  Setup failed: ${err}`);
    }

    // Run the agent
    const trajectory = await runAgent(
      task.id,
      task.description,
      taskTools(task),
      12
    );

    // Score the result
    const result = await scoreResult(task, trajectory);

    // Run LLM judge for judge-scored tasks or failures
    if (task.scorer === "judge" || !result.passed) {
      const judgment = await judgeTrajectory(task, trajectory);
      result.judgeScore = judgment.score;
      result.judgeReasoning = judgment.reasoning;

      if (task.scorer === "judge") {
        result.passed = judgment.score >= 4;
        result.score = judgment.score / 5;
      }
    }

    // Log result
    const status = result.passed ? "✓ PASS" : "✗ FAIL";
    const judgeInfo = result.judgeScore ? ` (judge: ${result.judgeScore}/5)` : "";
    const failInfo = result.failureMode ? ` [${result.failureMode}]` : "";
    console.log(`  ${status}${judgeInfo}${failInfo}`);
    console.log(
      `  Answer: ${(trajectory.finalAnswer ?? "(none)").slice(0, 120)}`
    );
    console.log(
      `  Steps: ${trajectory.steps.length}, Tokens: ${trajectory.totalInputTokens}in/${trajectory.totalOutputTokens}out, Time: ${(trajectory.totalElapsedMs / 1000).toFixed(1)}s`
    );

    // Update summary
    const cat = summary[task.category];
    if (cat) {
      cat.total++;
      if (result.passed) cat.passed++;
      cat.scores.push(result.score);
    }

    // Save trajectory and result
    const resultWithTask = { ...result, task };
    await writeFile(
      join(RESULTS_DIR, `${task.id}-trajectory.json`),
      JSON.stringify(trajectory, null, 2)
    );
    await writeFile(
      join(RESULTS_DIR, `${task.id}-result.json`),
      JSON.stringify(resultWithTask, null, 2)
    );
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  let totalPassed = 0;
  let totalTasks = 0;

  for (const [cat, data] of Object.entries(summary)) {
    if (data.total === 0) continue;
    const pct = Math.round((data.passed / data.total) * 100);
    const avgScore =
      data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    console.log(
      `${cat.padEnd(12)} ${data.passed}/${data.total} (${pct}%) — avg score: ${avgScore.toFixed(2)}`
    );
    totalPassed += data.passed;
    totalTasks += data.total;
  }

  console.log("-".repeat(60));
  const totalPct = Math.round((totalPassed / totalTasks) * 100);
  console.log(
    `TOTAL        ${totalPassed}/${totalTasks} (${totalPct}%)`
  );

  // Save summary
  await writeFile(
    join(RESULTS_DIR, "summary.json"),
    JSON.stringify({ summary, totalPassed, totalTasks, runAt: new Date().toISOString() }, null, 2)
  );

  console.log(`\nResults saved to ${RESULTS_DIR}`);
}

function taskTools(task: Task) {
  return getTools(task.tools);
}

// Parse CLI args
const args = process.argv.slice(2);
const options: RunOptions = {};

if (args.includes("--web")) options.categories = ["web"];
else if (args.includes("--code")) options.categories = ["code"];
else if (args.includes("--multistep")) options.categories = ["multistep"];

const maxIdx = args.indexOf("--max");
if (maxIdx !== -1) options.maxTasks = parseInt(args[maxIdx + 1]);

const taskIdx = args.indexOf("--task");
if (taskIdx !== -1) options.taskIds = [args[taskIdx + 1]];

runEval(options).catch(console.error);
