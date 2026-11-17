"use client";

import { useEffect, useRef, useState } from "react";
import { renameNode } from "@/lib/tree";

/** Inline-editable page title (saves on blur / Enter). */
export function TitleInput({
  id,
  title,
  autoFocus,
  onEnter,
}: {
  id: string;
  title: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const [value, setValue] = useState(title);
  const [prevTitle, setPrevTitle] = useState(title);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Sync when the title is changed elsewhere (sidebar rename, etc.)
  if (title !== prevTitle) {
    setPrevTitle(title);
    setValue(title);
  }

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(resize, [value]);

  useEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [autoFocus, id]);

  const commit = () => {
    const t = value.trim();
    if (!t) setValue(title);
    else if (t !== title) renameNode(id, t);
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label="Название"
      placeholder="Без названия"
      onChange={(e) => setValue(e.target.value.replace(/\n/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          onEnter?.();
        }
        if (e.key === "Escape") {
          setValue(title);
          ref.current?.blur();
        }
      }}
      className="w-full resize-none overflow-hidden bg-transparent text-[28px] font-bold leading-tight tracking-tight outline-none placeholder:text-faint sm:text-[34px]"
    />
  );
}
