import { webTasks } from "./web.js";
import { codeTasks } from "./code.js";
import { multistepTasks } from "./multistep.js";
import type { Task } from "./types.js";

export const ALL_TASKS: Task[] = [...webTasks, ...codeTasks, ...multistepTasks];

export { webTasks, codeTasks, multistepTasks };
export * from "./types.js";
