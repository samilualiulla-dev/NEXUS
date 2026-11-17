"use client";

import { memo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, FilePlus, FolderPlus, MoreHorizontal, Plus } from "lucide-react";
import type { TreeNode } from "@/lib/db";
import { ancestorsOf, childrenOf } from "@/lib/tree";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { useMenu } from "@/components/ui/Menu";
import { NodeIcon } from "./NodeIcon";
import { expandedStore, useExpanded } from "./expanded";
import { dragProps, useFolderDrop, useNodeDrop } from "./dnd";
import { nodeHref, useNodeActions } from "./useNodeActions";

/** Collapsible, drag-and-drop knowledge tree for the sidebar. */
export function Tree() {
  const { nodes, nodesLoaded, setSidebarOpen } = useApp();
  const pathname = usePathname();
  const activeId = pathname.startsWith("/n/") ? decodeURIComponent(pathname.slice(3)) : null;
  const expanded = useExpanded();
  const menu = useMenu();
  const actions = useNodeActions();
  const rootDrop = useFolderDrop(null, nodes);

  // Reveal the active node.
  useEffect(() => {
    if (!activeId) return;
    const path = ancestorsOf(nodes, activeId).slice(0, -1);
    expandedStore.openMany(path.map((n) => n.id));
  }, [activeId, nodes]);

  const roots = childrenOf(nodes, null);

  if (!nodesLoaded) {
    return (
      <div className="space-y-2 px-3 py-2">
        {[70, 55, 62].map((w) => (
          <div key={w} className="h-4 animate-pulse rounded bg-hover" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col" role="tree">
      {roots.length === 0 && (
        <div className="mx-2 rounded-lg border border-dashed border-line px-3 py-4 text-center text-[13px] text-muted">
          Пока пусто.
          <button
            className="mt-2 block w-full font-medium text-accent hover:underline"
            onClick={() => actions.createFolder(null)}
          >
            Создать первую папку
          </button>
        </div>
      )}
      {roots.map((n) => (
        <TreeItem
          key={n.id}
          node={n}
          depth={0}
          nodes={nodes}
          expanded={expanded}
          activeId={activeId}
          onMenu={menu.open}
          onNavigate={() => setSidebarOpen(false)}
        />
      ))}
      {roots.length > 0 && (
        <div
          {...rootDrop.props}
          className={cn(
            "mx-2 mt-1 h-6 rounded-md border border-dashed border-transparent text-center text-[11px] leading-5 text-transparent transition-colors",
            rootDrop.over && "border-accent text-accent"
          )}
        >
          В корень
        </div>
      )}
      {menu.element}
    </div>
  );
}

interface ItemProps {
  node: TreeNode;
  depth: number;
  nodes: TreeNode[];
  expanded: Set<string>;
  activeId: string | null;
  onMenu: ReturnType<typeof useMenu>["open"];
  onNavigate: () => void;
}

const TreeItem = memo(function TreeItem({
  node,
  depth,
  nodes,
  expanded,
  activeId,
  onMenu,
  onNavigate,
}: ItemProps) {
  const actions = useNodeActions();
  const isFolder = node.type === "folder";
  const isOpen = isFolder && expanded.has(node.id);
  const children = isFolder ? childrenOf(nodes, node.id) : [];
  const { indicator, props: dropProps } = useNodeDrop(node, nodes);
  const active = activeId === node.id;

  const openMenu = (anchor: DOMRect | { x: number; y: number }) =>
    onMenu(anchor, actions.menuItems(node, { reorder: true }));

  return (
    <div role="treeitem" aria-expanded={isFolder ? isOpen : undefined} aria-selected={active}>
      <div
        {...dragProps(node)}
        {...dropProps}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu({ x: e.clientX, y: e.clientY });
        }}
        className={cn(
          "group relative mx-1.5 flex h-8 items-center gap-1 rounded-md pr-1 text-[13.5px] transition-colors",
          active ? "bg-hover font-medium text-fg" : "text-fg/85 hover:bg-hover/70",
          indicator === "inside" && "bg-accent-soft ring-1 ring-accent"
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        {indicator === "before" && (
          <span className="pointer-events-none absolute inset-x-2 -top-px h-0.5 rounded bg-accent" />
        )}
        {indicator === "after" && (
          <span className="pointer-events-none absolute inset-x-2 -bottom-px h-0.5 rounded bg-accent" />
        )}

        {isFolder ? (
          <button
            aria-label={isOpen ? "Свернуть" : "Развернуть"}
            onClick={() => expandedStore.toggle(node.id)}
            className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-faint hover:text-fg"
          >
            <ChevronRight
              size={14}
              className={cn("transition-transform duration-150", isOpen && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <Link
          href={nodeHref(node.id)}
          onClick={onNavigate}
          draggable={false}
          className="flex min-w-0 flex-1 items-center gap-2 self-stretch"
        >
          <NodeIcon node={node} open={isOpen} size={15} />
          <span className="truncate">{node.title}</span>
        </Link>

        <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {isFolder && (
            <button
              aria-label="Добавить внутрь"
              title="Добавить внутрь"
              className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-line hover:text-fg"
              onClick={(e) =>
                onMenu(e.currentTarget.getBoundingClientRect(), [
                  { label: "Папку", icon: FolderPlus, onSelect: () => actions.createFolder(node.id) },
                  { label: "Заметку", icon: FilePlus, onSelect: () => actions.createNote(node.id) },
                ])
              }
            >
              <Plus size={14} />
            </button>
          )}
          <button
            aria-label="Действия"
            title="Действия"
            className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-line hover:text-fg"
            onClick={(e) => openMenu(e.currentTarget.getBoundingClientRect())}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div role="group">
          {children.length === 0 ? (
            <div
              className="py-1 text-[12px] text-faint"
              style={{ paddingLeft: 4 + (depth + 1) * 14 + 26 }}
            >
              Пусто
            </div>
          ) : (
            children.map((c) => (
              <TreeItem
                key={c.id}
                node={c}
                depth={depth + 1}
                nodes={nodes}
                expanded={expanded}
                activeId={activeId}
                onMenu={onMenu}
                onNavigate={onNavigate}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});
