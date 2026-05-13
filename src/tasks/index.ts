import { webTasks } from "./web.js";
import { codeTasks } from "./code.js";
import { multistepTasks } from "./multistep.js";
import { reasoningTasks } from "./reasoning.js";
import type { Task } from "./types.js";

export const ALL_TASKS: Task[] = [
  ...webTasks,
  ...codeTasks,
  ...multistepTasks,
  ...reasoningTasks,
];

export { webTasks, codeTasks, multistepTasks, reasoningTasks };
export * from "./types.js";
