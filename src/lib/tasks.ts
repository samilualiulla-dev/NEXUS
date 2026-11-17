import { db, newId, type Task } from "./db";
import { todayKey } from "./dates";

export type TaskInput = Omit<Task, "id" | "createdAt" | "done" | "completedAt"> & {
  done?: boolean;
};

export async function createTask(input: TaskInput) {
  const task: Task = {
    ...input,
    id: newId(),
    done: input.done ?? false,
    createdAt: Date.now(),
    completedAt: input.done ? Date.now() : undefined,
  };
  await db.tasks.add(task);
  return task;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  await db.tasks.update(id, patch);
}

export async function toggleTask(task: Task) {
  const done = !task.done;
  await db.tasks.update(task.id, {
    done,
    completedAt: done ? Date.now() : undefined,
  });
}

export async function deleteTask(id: string) {
  await db.tasks.delete(id);
}

export function isOverdue(t: Task, today = todayKey()) {
  return !t.done && !!t.dueDate && t.dueDate < today;
}

export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

export function sortTasks(a: Task, b: Task) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const ad = a.dueDate ?? "9999";
  const bd = b.dueDate ?? "9999";
  if (ad !== bd) return ad < bd ? -1 : 1;
  if (a.priority !== b.priority)
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return a.createdAt - b.createdAt;
}
