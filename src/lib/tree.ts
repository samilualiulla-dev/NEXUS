import { db, newId, type NodeType, type NoteTag, type TreeNode } from "./db";

/* ------------------------------------------------------------------ */
/*  Pure helpers (work on an in-memory list of nodes)                  */
/* ------------------------------------------------------------------ */

export function sortNodes(a: TreeNode, b: TreeNode) {
  if (a.order !== b.order) return a.order - b.order;
  return a.createdAt - b.createdAt;
}

export function childrenOf(nodes: TreeNode[], parentId: string | null) {
  return nodes.filter((n) => n.parentId === parentId).sort(sortNodes);
}

/** Path from the root down to `id` (inclusive). */
export function ancestorsOf(nodes: TreeNode[], id: string): TreeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: TreeNode[] = [];
  let cur = byId.get(id);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

/** All descendant ids of `id` (not including `id`). */
export function descendantIds(nodes: TreeNode[], id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of nodes) {
      if (n.parentId === cur) {
        out.push(n.id);
        stack.push(n.id);
      }
    }
  }
  return out;
}

export function pathLabel(nodes: TreeNode[], id: string) {
  return ancestorsOf(nodes, id)
    .map((n) => n.title)
    .join(" / ");
}

/* ------------------------------------------------------------------ */
/*  Database operations                                                */
/* ------------------------------------------------------------------ */

async function nextOrder(parentId: string | null) {
  // IndexedDB can't index null, so root nodes are filtered in memory.
  const list =
    parentId === null
      ? (await db.nodes.toArray()).filter((n) => n.parentId === null)
      : await db.nodes.where("parentId").equals(parentId).toArray();
  return list.reduce((m, n) => Math.max(m, n.order), -1) + 1;
}

export async function createNode(
  type: NodeType,
  parentId: string | null,
  title?: string
): Promise<TreeNode> {
  const now = Date.now();
  const node: TreeNode = {
    id: newId(),
    parentId,
    type,
    title: title?.trim() || (type === "folder" ? "Новая папка" : "Без названия"),
    order: await nextOrder(parentId),
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.nodes.add(node);
  return node;
}

export async function updateNode(id: string, patch: Partial<TreeNode>) {
  await db.nodes.update(id, { ...patch, updatedAt: Date.now() });
}

export async function renameNode(id: string, title: string) {
  const t = title.trim();
  if (!t) return;
  await updateNode(id, { title: t });
}

export async function setNodeTags(id: string, tags: NoteTag[]) {
  await updateNode(id, { tags });
}

/** Deletes a node with its whole subtree, note contents and files. */
export async function deleteNode(id: string) {
  await db.transaction(
    "rw",
    [db.nodes, db.docs, db.texts, db.attachments, db.tasks, db.events],
    async () => {
      const all = await db.nodes.toArray();
      const ids = [id, ...descendantIds(all, id)];
      await db.nodes.bulkDelete(ids);
      await db.docs.bulkDelete(ids);
      await db.texts.bulkDelete(ids);
      await db.attachments.where("nodeId").anyOf(ids).delete();
      // Keep tasks and events, only remove the link.
      await db.tasks
        .where("nodeId")
        .anyOf(ids)
        .modify((t) => {
          delete t.nodeId;
        });
      await db.events
        .where("nodeId")
        .anyOf(ids)
        .modify((e) => {
          delete e.nodeId;
        });
    }
  );
}

export async function countSubtree(id: string) {
  const all = await db.nodes.toArray();
  return descendantIds(all, id).length;
}

export type DropPosition = "before" | "after" | "inside";

/**
 * Checks whether `dragId` may be dropped relative to `targetId`.
 * A node can't be moved into itself or its own descendants,
 * and only folders accept children.
 */
export function canDrop(
  nodes: TreeNode[],
  dragId: string,
  targetId: string | null,
  position: DropPosition
) {
  if (targetId === null) return true; // root
  if (dragId === targetId) return false;
  if (descendantIds(nodes, dragId).includes(targetId)) return false;
  const target = nodes.find((n) => n.id === targetId);
  if (!target) return false;
  if (position === "inside" && target.type !== "folder") return false;
  return true;
}

/**
 * Moves a node. `targetId = null` with position "inside" moves it to root.
 * Siblings are renumbered so the order stays clean.
 */
export async function moveNode(
  dragId: string,
  targetId: string | null,
  position: DropPosition
) {
  await db.transaction("rw", db.nodes, async () => {
    const all = await db.nodes.toArray();
    if (!canDrop(all, dragId, targetId, position)) return;
    const drag = all.find((n) => n.id === dragId);
    if (!drag) return;

    let newParent: string | null;
    if (targetId === null || position === "inside") {
      newParent = targetId;
    } else {
      newParent = all.find((n) => n.id === targetId)!.parentId;
    }

    const siblings = childrenOf(all, newParent).filter((n) => n.id !== dragId);
    let index = siblings.length;
    if (targetId !== null && position !== "inside") {
      const ti = siblings.findIndex((n) => n.id === targetId);
      index = position === "before" ? ti : ti + 1;
    }
    siblings.splice(index, 0, drag);

    const now = Date.now();
    await Promise.all(
      siblings.map((n, i) =>
        n.id === dragId
          ? db.nodes.update(n.id, { parentId: newParent, order: i, updatedAt: now })
          : n.order !== i
            ? db.nodes.update(n.id, { order: i })
            : Promise.resolve(0)
      )
    );
  });
}

/** Moves a node one step up or down among its siblings. */
export async function shiftNode(id: string, dir: -1 | 1) {
  const all = await db.nodes.toArray();
  const node = all.find((n) => n.id === id);
  if (!node) return;
  const siblings = childrenOf(all, node.parentId);
  const i = siblings.findIndex((n) => n.id === id);
  const j = i + dir;
  if (j < 0 || j >= siblings.length) return;
  await moveNode(id, siblings[j].id, dir < 0 ? "before" : "after");
}

/** Duplicates a node with its whole subtree, contents and files. */
export async function duplicateNode(id: string): Promise<string | undefined> {
  let rootCopyId: string | undefined;
  await db.transaction(
    "rw",
    [db.nodes, db.docs, db.texts, db.attachments],
    async () => {
      const all = await db.nodes.toArray();
      const src = all.find((n) => n.id === id);
      if (!src) return;
      const ids = [id, ...descendantIds(all, id)];
      const map = new Map<string, string>(ids.map((i) => [i, newId()]));
      const now = Date.now();

      // Put the copy right after the original.
      const siblings = childrenOf(all, src.parentId);
      const pos = siblings.findIndex((n) => n.id === id);
      for (let i = pos + 1; i < siblings.length; i++) {
        await db.nodes.update(siblings[i].id, { order: i + 1 });
      }

      for (const oldId of ids) {
        const n = all.find((x) => x.id === oldId)!;
        const copy: TreeNode = {
          ...n,
          id: map.get(oldId)!,
          parentId: oldId === id ? n.parentId : map.get(n.parentId!)!,
          title: oldId === id ? `${n.title} (копия)` : n.title,
          order: oldId === id ? pos + 1 : n.order,
          createdAt: now,
          updatedAt: now,
        };
        await db.nodes.add(copy);
        const doc = await db.docs.get(oldId);
        if (doc) await db.docs.add({ id: copy.id, json: doc.json });
        const text = await db.texts.get(oldId);
        if (text) await db.texts.add({ id: copy.id, text: text.text });
        const files = await db.attachments.where("nodeId").equals(oldId).toArray();
        for (const f of files) {
          await db.attachments.add({ ...f, id: newId(), nodeId: copy.id });
        }
      }
      rootCopyId = map.get(id);
    }
  );
  return rootCopyId;
}

/* ------------------------------------------------------------------ */
/*  Note content                                                       */
/* ------------------------------------------------------------------ */

export async function saveNoteContent(id: string, json: string, text: string) {
  await db.transaction("rw", [db.docs, db.texts, db.nodes], async () => {
    await db.docs.put({ id, json });
    await db.texts.put({ id, text });
    await db.nodes.update(id, { updatedAt: Date.now() });
  });
}

export async function loadNoteDoc(id: string) {
  return (await db.docs.get(id))?.json;
}
