/**
 * Interactive calibration tool: review judge-scored trajectories and add
 * human scores. Run with: npx tsx src/eval/calibrate.ts
 *
 * Outputs correlation between judge scores and human scores.
 */
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as readline from "readline";
import type { Trajectory } from "../agent.js";

const RESULTS_DIR = new URL("../../results", import.meta.url).pathname;

async function prompt(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(q, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
      ys.reduce((s, y) => s + (y - my) ** 2, 0)
  );
  return den === 0 ? 0 : num / den;
}

async function main() {
  const files = await readdir(RESULTS_DIR);
  const resultFiles = files.filter((f) => f.endsWith("-result.json"));

  const judgeScores: number[] = [];
  const humanScores: number[] = [];

  console.log("\n=== Judge Calibration ===");
  console.log("Rate each task 1-5 (or 's' to skip, 'q' to quit)\n");
  console.log("Scale:");
  console.log("  5 = Perfect answer, used tools correctly");
  console.log("  4 = Good, minor issues");
  console.log("  3 = Partial, significant gaps");
  console.log("  2 = Poor, minimal progress");
  console.log("  1 = Failed completely\n");

  for (const file of resultFiles) {
    const taskId = file.replace("-result.json", "");
    const resultPath = join(RESULTS_DIR, file);
    const trajPath = join(RESULTS_DIR, `${taskId}-trajectory.json`);
    const judgePath = join(RESULTS_DIR, `${taskId}-judge.json`);

    let result, traj, judge;
    try {
      result = JSON.parse(await readFile(resultPath, "utf-8"));
      traj = JSON.parse(await readFile(trajPath, "utf-8")) as Trajectory;
    } catch {
      continue;
    }

    try {
      judge = JSON.parse(await readFile(judgePath, "utf-8"));
    } catch {
      continue; // skip tasks without judge scores
    }

    // Display the task summary
    console.log("─".repeat(60));
    console.log(`Task: ${taskId} (${result.category})`);
    console.log(`Description: ${result.task?.description?.slice(0, 120) ?? "N/A"}`);
    console.log(`\nAgent answer: ${(traj.finalAnswer ?? "(none)").slice(0, 200)}`);
    console.log(`\nSteps taken: ${traj.steps.length}`);
    if (traj.steps.some((s: { toolCalls?: unknown[] }) => s.toolCalls?.length)) {
      const toolNames = traj.steps
        .flatMap((s: { toolCalls?: { name: string }[] }) => s.toolCalls?.map((c) => c.name) ?? [])
        .join(", ");
      console.log(`Tools used: ${toolNames}`);
    }
    console.log(`\nLLM Judge scored: ${judge.score}/5`);
    console.log(`Judge reasoning: ${judge.reasoning}`);

    const answer = await prompt("\nYour score (1-5, s=skip, q=quit): ");
    if (answer.toLowerCase() === "q") break;
    if (answer.toLowerCase() === "s") continue;

    const humanScore = parseInt(answer);
    if (isNaN(humanScore) || humanScore < 1 || humanScore > 5) {
      console.log("Invalid score, skipping.");
      continue;
    }

    judgeScores.push(judge.score);
    humanScores.push(humanScore);

    // Save human score to result file
    result.humanScore = humanScore;
    await writeFile(resultPath, JSON.stringify(result, null, 2));

    console.log(
      `  Judge: ${judge.score}/5, You: ${humanScore}/5, Diff: ${Math.abs(judge.score - humanScore)}`
    );
  }

  if (judgeScores.length < 2) {
    console.log("\nNeed at least 2 rated tasks for correlation.");
    return;
  }

  const r = pearsonR(judgeScores, humanScores);
  const mae =
    judgeScores.reduce((s, v, i) => s + Math.abs(v - humanScores[i]), 0) /
    judgeScores.length;

  console.log("\n" + "=".repeat(60));
  console.log("CALIBRATION RESULTS");
  console.log("=".repeat(60));
  console.log(`Rated tasks: ${judgeScores.length}`);
  console.log(`Pearson r (judge vs human): ${r.toFixed(3)}`);
  console.log(`Mean absolute error: ${mae.toFixed(2)}`);
  console.log(`\nInterpretation:`);
  if (r > 0.8) console.log("  r > 0.8: Judge well-calibrated with human ratings");
  else if (r > 0.5)
    console.log("  r 0.5-0.8: Moderate agreement, some systematic bias");
  else console.log("  r < 0.5: Judge poorly calibrated, consider revising rubrics");

  // Show disagreements
  const disagreements = judgeScores
    .map((j, i) => ({ j, h: humanScores[i], diff: Math.abs(j - humanScores[i]) }))
    .filter((d) => d.diff >= 2);
  if (disagreements.length > 0) {
    console.log(`\nLarge disagreements (|diff| >= 2): ${disagreements.length}`);
    disagreements.forEach((d) =>
      console.log(`  Judge: ${d.j}/5, Human: ${d.h}/5`)
    );
  }
}

main().catch(console.error);
