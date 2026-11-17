import Dexie, { type EntityTable } from "dexie";
import { APP_CONFIG } from "@/config/app";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NodeType = "folder" | "note";
export type NoteTag = "important" | "review" | "understood" | "in_progress";
export type Priority = "low" | "medium" | "high";

/**
 * A node of the knowledge tree. Folders and notes share one table,
 * so any folder can contain folders and notes at any depth.
 * Heavy note content lives in separate tables (`docs`, `texts`)
 * so the tree stays light and fast.
 */
export interface TreeNode {
  id: string;
  parentId: string | null; // null = root level
  type: NodeType;
  title: string;
  order: number; // position among siblings
  icon?: string; // optional emoji
  tags: NoteTag[];
  createdAt: number;
  updatedAt: number;
}

/** Rich-text document of a note (TipTap JSON). */
export interface NoteDoc {
  id: string; // = TreeNode.id
  json: string;
}

/** Plain text of a note, used for full-text search. */
export interface NoteText {
  id: string; // = TreeNode.id
  text: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority: Priority;
  dueDate?: string; // "yyyy-MM-dd"
  done: boolean;
  nodeId?: string; // linked folder / note
  createdAt: number;
  completedAt?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "yyyy-MM-dd"
  start?: string; // "HH:mm"
  end?: string; // "HH:mm"
  description?: string;
  notes?: string;
  priority: Priority;
  done: boolean;
  nodeId?: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  nodeId: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/*  Database                                                           */
/* ------------------------------------------------------------------ */

export const db = new Dexie(APP_CONFIG.dbName) as Dexie & {
  nodes: EntityTable<TreeNode, "id">;
  docs: EntityTable<NoteDoc, "id">;
  texts: EntityTable<NoteText, "id">;
  tasks: EntityTable<Task, "id">;
  events: EntityTable<CalendarEvent, "id">;
  attachments: EntityTable<Attachment, "id">;
};

db.version(1).stores({
  nodes: "id, parentId, type, updatedAt, *tags",
  docs: "id",
  texts: "id",
  tasks: "id, dueDate, done, nodeId, priority, category",
  events: "id, date, nodeId",
  attachments: "id, nodeId",
});

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
