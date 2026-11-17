"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  FilePlus,
  FolderInput,
  FolderPlus,
  Pencil,
  Smile,
  Trash2,
} from "lucide-react";
import type { TreeNode } from "@/lib/db";
import {
  ancestorsOf,
  countSubtree,
  createNode,
  deleteNode,
  duplicateNode,
  renameNode,
  shiftNode,
  updateNode,
} from "@/lib/tree";
import { useApp } from "@/components/providers/AppContext";
import type { MenuItem } from "@/components/ui/Menu";
import { expandedStore } from "./expanded";

export const nodeHref = (id: string) => `/n/${id}`;

/** Notes created in this session whose title should get focus once opened. */
const freshNotes = new Set<string>();
export const isFreshNote = (id: string) => freshNotes.has(id);
export const forgetFreshNote = (id: string) => freshNotes.delete(id);

/** All actions on folders/notes, shared by the sidebar, folder and note pages. */
export function useNodeActions() {
  const { confirm, prompt, setMoveTarget, nodes, setSidebarOpen } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const createFolder = useCallback(
    async (parentId: string | null) => {
      const title = await prompt({
        title: "Новая папка",
        placeholder: "Например: Физика",
        confirmLabel: "Создать",
      });
      if (!title) return;
      const node = await createNode("folder", parentId, title);
      if (parentId) expandedStore.set(parentId, true);
      return node;
    },
    [prompt]
  );

  const createNote = useCallback(
    async (parentId: string | null) => {
      const node = await createNode("note", parentId);
      if (parentId) expandedStore.set(parentId, true);
      setSidebarOpen(false);
      freshNotes.add(node.id);
      router.push(nodeHref(node.id));
      return node;
    },
    [router, setSidebarOpen]
  );

  const rename = useCallback(
    async (node: TreeNode) => {
      const title = await prompt({
        title: node.type === "folder" ? "Переименовать папку" : "Переименовать заметку",
        initial: node.title,
      });
      if (title) await renameNode(node.id, title);
    },
    [prompt]
  );

  const setIcon = useCallback(
    async (node: TreeNode) => {
      const icon = await prompt({
        title: "Иконка",
        label: "Эмодзи",
        initial: node.icon ?? "",
        placeholder: "Например: 📘  (введите «-», чтобы убрать)",
      });
      if (icon === null) return;
      const first = [...new Intl.Segmenter().segment(icon.trim())][0]?.segment;
      await updateNode(node.id, { icon: icon.trim() === "-" ? undefined : first });
    },
    [prompt]
  );

  const remove = useCallback(
    async (node: TreeNode) => {
      const inner = await countSubtree(node.id);
      const ok = await confirm({
        title: node.type === "folder" ? "Удалить папку?" : "Удалить заметку?",
        text:
          `«${node.title}» будет удалена безвозвратно` +
          (inner ? ` вместе со всем содержимым (${inner} эл.).` : "."),
        confirmLabel: "Удалить",
        danger: true,
      });
      if (!ok) return;
      // If the open page is inside the deleted subtree, go to the parent.
      const currentId = pathname.startsWith("/n/") ? pathname.slice(3) : null;
      const affected =
        currentId && ancestorsOf(nodes, currentId).some((n) => n.id === node.id);
      await deleteNode(node.id);
      if (affected) router.push(node.parentId ? nodeHref(node.parentId) : "/");
    },
    [confirm, nodes, pathname, router]
  );

  const duplicate = useCallback(async (node: TreeNode) => {
    await duplicateNode(node.id);
  }, []);

  const menuItems = useCallback(
    (node: TreeNode, opts: { reorder?: boolean } = {}): MenuItem[] => {
      const items: MenuItem[] = [];
      if (node.type === "folder") {
        items.push(
          { label: "Новая папка внутри", icon: FolderPlus, onSelect: () => createFolder(node.id) },
          { label: "Новая заметка внутри", icon: FilePlus, onSelect: () => createNote(node.id) },
          "separator"
        );
      }
      items.push(
        { label: "Переименовать", icon: Pencil, onSelect: () => rename(node) },
        { label: "Иконка", icon: Smile, onSelect: () => setIcon(node) },
        { label: "Дублировать", icon: Copy, onSelect: () => duplicate(node) },
        { label: "Переместить в…", icon: FolderInput, onSelect: () => setMoveTarget(node.id) }
      );
      if (opts.reorder) {
        items.push(
          { label: "Выше", icon: ArrowUp, onSelect: () => shiftNode(node.id, -1) },
          { label: "Ниже", icon: ArrowDown, onSelect: () => shiftNode(node.id, 1) }
        );
      }
      items.push("separator", {
        label: "Удалить",
        icon: Trash2,
        danger: true,
        onSelect: () => remove(node),
      });
      return items;
    },
    [createFolder, createNote, rename, setIcon, duplicate, setMoveTarget, remove]
  );

  return { createFolder, createNote, rename, remove, duplicate, setIcon, menuItems };
}
