"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { FilePlus, FolderOpen, FolderPlus, MoreHorizontal, Paperclip } from "lucide-react";
import { db, type TreeNode } from "@/lib/db";
import { childrenOf, descendantIds } from "@/lib/tree";
import { fmt } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { Button, EmptyState, IconButton, SectionTitle } from "@/components/ui/primitives";
import { useMenu } from "@/components/ui/Menu";
import { Breadcrumbs } from "./Breadcrumbs";
import { TitleInput } from "./TitleInput";
import { NodeIcon } from "./NodeIcon";
import { TagDots } from "./TagPicker";
import { Attachments } from "./Attachments";
import { LinkedItems } from "./LinkedItems";
import { dragProps, useNodeDrop } from "./dnd";
import { nodeHref, useNodeActions } from "./useNodeActions";

export function FolderView({ node }: { node: TreeNode }) {
  const { nodes } = useApp();
  const actions = useNodeActions();
  const menu = useMenu();
  const fileRef = useRef<HTMLInputElement>(null);

  const children = childrenOf(nodes, node.id);
  const folders = children.filter((c) => c.type === "folder");
  const notes = children.filter((c) => c.type === "note");
  const subtree = useMemo(() => [node.id, ...descendantIds(nodes, node.id)], [nodes, node.id]);

  const noteIds = notes.map((n) => n.id).join(",");
  const excerpts = useLiveQuery(
    async () => {
      const rows = await db.texts.bulkGet(noteIds ? noteIds.split(",") : []);
      return new Map(rows.filter(Boolean).map((r) => [r!.id, r!.text.slice(0, 160)]));
    },
    [noteIds]
  );

  return (
    <div className="page-enter mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-8 sm:pt-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Breadcrumbs nodeId={node.id} />
        <IconButton
          icon={MoreHorizontal}
          label="Действия с папкой"
          onClick={(e) => menu.open(e.currentTarget.getBoundingClientRect(), actions.menuItems(node))}
        />
      </div>

      <div className="flex items-start gap-3">
        <span className="pt-1.5">
          <NodeIcon node={node} open size={30} />
        </span>
        <TitleInput id={node.id} title={node.title} />
      </div>
      <p className="mt-1 text-[13px] text-muted">
        {folders.length} папок · {notes.length} заметок · всего внутри {subtree.length - 1}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button icon={FolderPlus} size="sm" onClick={() => actions.createFolder(node.id)}>
          Папка
        </Button>
        <Button icon={FilePlus} size="sm" onClick={() => actions.createNote(node.id)}>
          Заметка
        </Button>
        <Button icon={Paperclip} size="sm" onClick={() => fileRef.current?.click()}>
          Файл
        </Button>
      </div>

      {children.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={FolderOpen}
            title="Папка пуста"
            text="Создайте вложенную папку для раздела или заметку для темы. Элементы можно перетаскивать."
          />
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <section className="mt-8">
              <SectionTitle>Папки</SectionTitle>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {folders.map((f) => (
                  <ChildCard key={f.id} node={f} nodes={nodes} onMenu={menu.open} />
                ))}
              </div>
            </section>
          )}
          {notes.length > 0 && (
            <section className="mt-8">
              <SectionTitle>Заметки</SectionTitle>
              <div className="flex flex-col gap-1.5">
                {notes.map((n) => (
                  <ChildCard
                    key={n.id}
                    node={n}
                    nodes={nodes}
                    excerpt={excerpts?.get(n.id)}
                    onMenu={menu.open}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Attachments nodeId={node.id} inputRef={fileRef} />
      <LinkedItems nodeId={node.id} subtreeIds={subtree} />
      {menu.element}
    </div>
  );
}

function ChildCard({
  node,
  nodes,
  excerpt,
  onMenu,
}: {
  node: TreeNode;
  nodes: TreeNode[];
  excerpt?: string;
  onMenu: ReturnType<typeof useMenu>["open"];
}) {
  const actions = useNodeActions();
  const { indicator, props } = useNodeDrop(node, nodes);
  const inner = node.type === "folder" ? childrenOf(nodes, node.id).length : 0;

  return (
    <div
      {...dragProps(node)}
      {...props}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu({ x: e.clientX, y: e.clientY }, actions.menuItems(node, { reorder: true }));
      }}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3 transition-all hover:border-line-strong hover:shadow-sm",
        indicator === "inside" && "border-accent bg-accent-soft",
        indicator === "before" && "shadow-[0_-2px_0_0_var(--accent)]",
        indicator === "after" && "shadow-[0_2px_0_0_var(--accent)]"
      )}
    >
      <Link href={nodeHref(node.id)} draggable={false} className="flex min-w-0 flex-1 items-center gap-3">
        <NodeIcon node={node} size={18} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{node.title}</span>
            <TagDots tags={node.tags} />
          </span>
          <span className="block truncate text-[12px] text-muted">
            {node.type === "folder"
              ? `${inner} элем.`
              : excerpt?.trim() || `Изменено ${fmt(new Date(node.updatedAt), "d MMM, HH:mm")}`}
          </span>
        </span>
      </Link>
      <IconButton
        icon={MoreHorizontal}
        label="Действия"
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        onClick={(e) => onMenu(e.currentTarget.getBoundingClientRect(), actions.menuItems(node, { reorder: true }))}
      />
    </div>
  );
}
