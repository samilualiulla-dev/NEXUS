import { db, type CalendarEvent, type NoteTag, type Task, type TreeNode } from "./db";
import { pathLabel } from "./tree";

export const normalize = (s: string) =>
  s.toLocaleLowerCase("ru").replace(/ё/g, "е");

export interface SearchResults {
  folders: { node: TreeNode; path: string }[];
  notes: { node: TreeNode; path: string; snippet?: string }[];
  tasks: Task[];
  events: CalendarEvent[];
}

function snippetAround(text: string, q: string, radius = 60) {
  const i = normalize(text).indexOf(q);
  if (i < 0) return undefined;
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + q.length + radius);
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, end).replace(/\s+/g, " ") +
    (end < text.length ? "…" : "")
  );
}

/**
 * Global search: folders, notes (title + full content), tasks, events.
 * Personal data sets are small, so an in-memory scan is fast and simple.
 */
export async function searchAll(
  query: string,
  tags: NoteTag[] = [],
  limit = 30
): Promise<SearchResults> {
  const q = normalize(query.trim());
  const res: SearchResults = { folders: [], notes: [], tasks: [], events: [] };
  if (!q && tags.length === 0) return res;

  const nodes = await db.nodes.toArray();
  const texts = q ? await db.texts.toArray() : [];
  const textById = new Map(texts.map((t) => [t.id, t.text]));
  const hasTags = (n: TreeNode) => tags.every((t) => n.tags.includes(t));

  for (const n of nodes) {
    if (!hasTags(n)) continue;
    const inTitle = !q || normalize(n.title).includes(q);
    if (n.type === "folder") {
      if (inTitle && res.folders.length < limit)
        res.folders.push({ node: n, path: pathLabel(nodes, n.id) });
    } else {
      const text = textById.get(n.id) ?? "";
      const snippet = q ? snippetAround(text, q) : undefined;
      if ((inTitle || snippet) && res.notes.length < limit)
        res.notes.push({ node: n, path: pathLabel(nodes, n.id), snippet });
    }
  }
  res.notes.sort((a, b) => b.node.updatedAt - a.node.updatedAt);

  if (q && tags.length === 0) {
    const match = (...fields: (string | undefined)[]) =>
      fields.some((f) => f && normalize(f).includes(q));
    res.tasks = (await db.tasks.toArray())
      .filter((t) => match(t.title, t.description, t.category))
      .slice(0, limit);
    res.events = (await db.events.toArray())
      .filter((e) => match(e.title, e.description, e.notes))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, limit);
  }
  return res;
}
