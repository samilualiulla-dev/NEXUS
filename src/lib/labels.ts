import type { NoteTag, Priority } from "./db";

export const TAGS: Record<NoteTag, { label: string; className: string; dot: string }> = {
  important: { label: "Важно", className: "bg-danger-soft text-danger", dot: "bg-danger" },
  review: { label: "Повторить", className: "bg-warn-soft text-warn", dot: "bg-warn" },
  understood: { label: "Понятно", className: "bg-ok-soft text-ok", dot: "bg-ok" },
  in_progress: { label: "В процессе", className: "bg-accent-soft text-accent", dot: "bg-accent" },
};

export const TAG_KEYS = Object.keys(TAGS) as NoteTag[];

export const PRIORITIES: Record<Priority, { label: string; className: string; dot: string }> = {
  high: { label: "Высокий", className: "bg-danger-soft text-danger", dot: "bg-danger" },
  medium: { label: "Средний", className: "bg-warn-soft text-warn", dot: "bg-warn" },
  low: { label: "Низкий", className: "bg-surface-2 text-muted", dot: "bg-faint" },
};

export const PRIORITY_KEYS: Priority[] = ["high", "medium", "low"];
