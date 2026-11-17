"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MoreHorizontal, TriangleAlert } from "lucide-react";
import type { TreeNode } from "@/lib/db";
import { fmt } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/primitives";
import { useMenu } from "@/components/ui/Menu";
import { NoteEditor, type SaveStatus } from "@/components/editor/NoteEditor";
import { Breadcrumbs } from "./Breadcrumbs";
import { TitleInput } from "./TitleInput";
import { TagPicker } from "./TagPicker";
import { Attachments } from "./Attachments";
import { LinkedItems } from "./LinkedItems";
import { forgetFreshNote, isFreshNote, useNodeActions } from "./useNodeActions";

function SaveIndicator({ status, updatedAt }: { status: SaveStatus; updatedAt: number }) {
  const map = {
    idle: { icon: Check, text: `Изменено ${fmt(new Date(updatedAt), "d MMM, HH:mm")}` },
    saving: { icon: Loader2, text: "Сохранение…" },
    saved: { icon: Check, text: "Сохранено" },
    error: { icon: TriangleAlert, text: "Ошибка сохранения" },
  }[status];
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[12px] text-faint",
        status === "error" && "text-danger"
      )}
      aria-live="polite"
    >
      <map.icon size={13} className={status === "saving" ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{map.text}</span>
    </span>
  );
}

export function NoteView({ node }: { node: TreeNode }) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  // Right after creating a note, focus its title.
  const [isNew] = useState(() => isFreshNote(node.id));
  useEffect(() => {
    forgetFreshNote(node.id);
  }, [node.id]);
  const fileRef = useRef<HTMLInputElement>(null);
  const actions = useNodeActions();
  const menu = useMenu();


  return (
    <div className="page-enter mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-8 sm:pt-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Breadcrumbs nodeId={node.id} />
        <div className="flex shrink-0 items-center gap-2">
          <SaveIndicator status={status} updatedAt={node.updatedAt} />
          <IconButton
            icon={MoreHorizontal}
            label="Действия"
            onClick={(e) => menu.open(e.currentTarget.getBoundingClientRect(), actions.menuItems(node))}
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        {node.icon && <span className="pt-1 text-[30px] leading-none">{node.icon}</span>}
        <TitleInput
          id={node.id}
          title={node.title}
          autoFocus={isNew}
          onEnter={() => (document.querySelector(".prose-nexus") as HTMLElement | null)?.focus()}
        />
      </div>
      <div className="mb-4 mt-3">
        <TagPicker node={node} />
      </div>

      <NoteEditor nodeId={node.id} onStatus={setStatus} onAttach={() => fileRef.current?.click()} />
      <Attachments nodeId={node.id} inputRef={fileRef} />
      <LinkedItems nodeId={node.id} subtreeIds={[node.id]} />
      {menu.element}
    </div>
  );
}
