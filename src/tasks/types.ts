export type TaskCategory = "web" | "code" | "multistep" | "reasoning";

export type ScorerType =
  | "exact"       // exact string match
  | "contains"    // answer contains expected string
  | "regex"       // answer matches regex
  | "code_test"   // run tests, check pass/fail
  | "judge";      // LLM-as-judge

export interface Task {
  id: string;
  category: TaskCategory;
  description: string;
  tools: string[];
  scorer: ScorerType;
  // For exact/contains/regex:
  expected?: string;
  // For regex:
  expectedPattern?: string;
  // For code_test: files to write and test command to run
  setupFiles?: Record<string, string>;   // path -> content
  testCommand?: string;
  // For judge:
  rubric?: string;
  // Human-readable notes on what correct looks like
  notes?: string;
}

export interface EvalResult {
  taskId: string;
  category: TaskCategory;
  passed: boolean;
  score: number; // 0-1
  failureMode?: FailureMode;
  judgeScore?: number;    // 1-5 from LLM judge
  judgeReasoning?: string;
  humanScore?: number;    // 1-5 from human (if calibration run)
}

export type FailureMode =
  | "wrong_answer"
  | "hallucination"    // answered without using tools
  | "reward_hack"      // agent read/inspected test file to extract expected answer
  | "tool_error"       // tool call failed
  | "max_steps"
  | "max_tokens"
  | "api_error"
  | "no_answer"
  | "format_error";

export interface EvalMeta {
  model: string;
  runAt: string;
  totalTasks: number;
  totalPassed: number;
  passRate: number;
  // Wilson score 95% CI
  ciLow: number;
  ciHigh: number;
}
