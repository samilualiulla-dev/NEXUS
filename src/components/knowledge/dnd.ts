"use client";

import { useState } from "react";
import type { TreeNode } from "@/lib/db";
import { canDrop, moveNode, type DropPosition } from "@/lib/tree";
import { expandedStore } from "./expanded";

/**
 * Native HTML5 drag & drop for tree nodes (desktop).
 * On touch devices the "Move to…" and "Up/Down" menu items are used instead.
 */
export const NODE_MIME = "application/x-nexus-node";
let draggingId: string | null = null;

export function dragProps(node: TreeNode) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      draggingId = node.id;
      e.dataTransfer.setData(NODE_MIME, node.id);
      e.dataTransfer.setData("text/plain", node.title);
      e.dataTransfer.effectAllowed = "move";
      e.stopPropagation();
    },
    onDragEnd: () => {
      draggingId = null;
    },
  };
}

function positionFor(e: React.DragEvent, el: HTMLElement, isFolder: boolean): DropPosition {
  const r = el.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height;
  if (!isFolder) return y < 0.5 ? "before" : "after";
  if (y < 0.25) return "before";
  if (y > 0.75) return "after";
  return "inside";
}

/** Drop target behaviour for a node row. */
export function useNodeDrop(node: TreeNode, nodes: TreeNode[]) {
  const [indicator, setIndicator] = useState<DropPosition | null>(null);

  const props = {
    onDragOver: (e: React.DragEvent<HTMLElement>) => {
      if (!draggingId) return;
      const pos = positionFor(e, e.currentTarget, node.type === "folder");
      if (!canDrop(nodes, draggingId, node.id, pos)) {
        setIndicator(null);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      if (pos !== indicator) setIndicator(pos);
    },
    onDragLeave: () => setIndicator(null),
    onDrop: async (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const id = draggingId ?? e.dataTransfer.getData(NODE_MIME);
      const pos = positionFor(e, e.currentTarget, node.type === "folder");
      setIndicator(null);
      draggingId = null;
      if (!id || !canDrop(nodes, id, node.id, pos)) return;
      await moveNode(id, node.id, pos);
      if (pos === "inside") expandedStore.set(node.id, true);
    },
  };
  return { indicator, props };
}

/** Drop target that moves a node into a given folder (or root when null). */
export function useFolderDrop(folderId: string | null, nodes: TreeNode[]) {
  const [over, setOver] = useState(false);
  const props = {
    onDragOver: (e: React.DragEvent) => {
      if (!draggingId || !canDrop(nodes, draggingId, folderId, "inside")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const id = draggingId ?? e.dataTransfer.getData(NODE_MIME);
      draggingId = null;
      if (id && canDrop(nodes, id, folderId, "inside")) await moveNode(id, folderId, "inside");
    },
  };
  return { over, props };
}
