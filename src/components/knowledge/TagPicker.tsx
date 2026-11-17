"use client";

import type { NoteTag, TreeNode } from "@/lib/db";
import { setNodeTags } from "@/lib/tree";
import { TAGS, TAG_KEYS } from "@/lib/labels";
import { cn } from "@/lib/cn";

/** Status tags: Important / Need to review / Understood / In progress. */
export function TagPicker({ node }: { node: TreeNode }) {
  const toggle = (t: NoteTag) =>
    setNodeTags(node.id, node.tags.includes(t) ? node.tags.filter((x) => x !== t) : [...node.tags, t]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_KEYS.map((t) => {
        const on = node.tags.includes(t);
        return (
          <button
            key={t}
            onClick={() => toggle(t)}
            aria-pressed={on}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] transition-colors",
              on
                ? cn(TAGS[t].className, "border-transparent font-medium")
                : "border-dashed border-line-strong text-faint hover:border-solid hover:text-muted"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", on ? TAGS[t].dot : "bg-line-strong")} />
            {TAGS[t].label}
          </button>
        );
      })}
    </div>
  );
}

export function TagDots({ tags }: { tags: NoteTag[] }) {
  if (!tags.length) return null;
  return (
    <span className="flex items-center gap-1">
      {tags.map((t) => (
        <span key={t} title={TAGS[t].label} className={cn("h-1.5 w-1.5 rounded-full", TAGS[t].dot)} />
      ))}
    </span>
  );
}
