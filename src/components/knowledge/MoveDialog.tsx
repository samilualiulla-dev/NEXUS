"use client";

import { useMemo, useState } from "react";
import { Home } from "lucide-react";
import type { TreeNode } from "@/lib/db";
import { canDrop, childrenOf, moveNode } from "@/lib/tree";
import { normalize } from "@/lib/search";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/primitives";
import { NodeIcon } from "./NodeIcon";
import { expandedStore } from "./expanded";

/** Flattens folders depth-first for a picker list. */
export function flattenFolders(nodes: TreeNode[]) {
  const out: { node: TreeNode; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const n of childrenOf(nodes, parent)) {
      if (n.type !== "folder") continue;
      out.push({ node: n, depth });
      walk(n.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function MoveDialog() {
  const { moveTarget, setMoveTarget, nodes } = useApp();
  const [filter, setFilter] = useState("");
  const node = nodes.find((n) => n.id === moveTarget);

  const options = useMemo(() => {
    if (!moveTarget) return [];
    const q = normalize(filter.trim());
    return flattenFolders(nodes).filter(
      ({ node: f }) =>
        canDrop(nodes, moveTarget, f.id, "inside") && (!q || normalize(f.title).includes(q))
    );
  }, [nodes, moveTarget, filter]);

  const close = () => {
    setMoveTarget(null);
    setFilter("");
  };

  const moveTo = async (folderId: string | null) => {
    if (!moveTarget) return;
    await moveNode(moveTarget, folderId, "inside");
    if (folderId) expandedStore.set(folderId, true);
    close();
  };

  return (
    <Modal open={!!node} onClose={close} title={`Переместить «${node?.title ?? ""}»`}>
      <Input
        placeholder="Найти папку…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-3"
      />
      <div className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto">
        {!filter && (
          <button
            onClick={() => moveTo(null)}
            disabled={node?.parentId === null}
            className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-left text-sm hover:bg-hover disabled:opacity-40"
          >
            <Home size={15} className="text-muted" /> Корень
          </button>
        )}
        {options.map(({ node: f, depth }) => (
          <button
            key={f.id}
            onClick={() => moveTo(f.id)}
            disabled={node?.parentId === f.id}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-left text-sm hover:bg-hover disabled:opacity-40"
            )}
            style={{ paddingLeft: 10 + (filter ? 0 : depth * 16) }}
          >
            <NodeIcon node={f} size={15} />
            <span className="truncate">{f.title}</span>
            {node?.parentId === f.id && <span className="ml-auto text-xs text-faint">сейчас здесь</span>}
          </button>
        ))}
        {options.length === 0 && filter && (
          <p className="px-2.5 py-4 text-sm text-muted">Папки не найдены</p>
        )}
      </div>
    </Modal>
  );
}
