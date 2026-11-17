"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Circle, CornerDownLeft, Search, X } from "lucide-react";
import type { NoteTag } from "@/lib/db";
import { searchAll, type SearchResults } from "@/lib/search";
import { TAGS, TAG_KEYS } from "@/lib/labels";
import { fmt } from "@/lib/dates";
import { timeRange } from "@/lib/events";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { NodeIcon } from "@/components/knowledge/NodeIcon";
import { nodeHref } from "@/components/knowledge/useNodeActions";
import { Kbd } from "@/components/ui/primitives";

interface Row {
  key: string;
  group: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onSelect: () => void;
}

const EMPTY: SearchResults = { folders: [], notes: [], tasks: [], events: [] };

/** Global search across folders, notes (content), tasks and events. */
export function CommandPalette() {
  const { searchOpen, setSearchOpen, editTask, nodes } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<NoteTag[]>([]);
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 10);
  }, [searchOpen]);

  // Debounced search; re-runs when data changes (nodes) too.
  useEffect(() => {
    if (!searchOpen) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await searchAll(query, tags);
      if (!cancelled) {
        setResults(r);
        setActive(0);
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, tags, searchOpen, nodes]);

  const close = () => {
    setSearchOpen(false);
    setQuery("");
    setTags([]);
    setResults(EMPTY);
  };

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const { node, path } of results.folders)
      out.push({
        key: node.id,
        group: "Папки",
        icon: <NodeIcon node={node} size={16} />,
        title: node.title,
        subtitle: path,
        onSelect: () => go(nodeHref(node.id)),
      });
    for (const { node, path, snippet } of results.notes)
      out.push({
        key: node.id,
        group: "Заметки",
        icon: <NodeIcon node={node} size={16} />,
        title: node.title,
        subtitle: snippet ?? path,
        onSelect: () => go(nodeHref(node.id)),
      });
    for (const t of results.tasks)
      out.push({
        key: t.id,
        group: "Задачи",
        icon: t.done ? (
          <CheckCircle2 size={16} className="text-ok" />
        ) : (
          <Circle size={16} className="text-muted" />
        ),
        title: t.title,
        subtitle: t.dueDate ? `Срок: ${fmt(t.dueDate, "d MMMM yyyy")}` : t.category,
        onSelect: () => {
          close();
          editTask({ task: t });
        },
      });
    for (const e of results.events)
      out.push({
        key: e.id,
        group: "События",
        icon: <CalendarDays size={16} className="text-muted" />,
        title: e.title,
        subtitle: `${fmt(e.date, "EEEE, d MMMM yyyy")} ${timeRange(e)}`,
        onSelect: () => go(`/planner?view=day&date=${e.date}`),
      });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!searchOpen) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      rows[active]?.onSelect();
    } else if (e.key === "Escape") {
      close();
    }
  };

  const hasInput = query.trim() || tags.length;
  let lastGroup = "";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[8vh]" onKeyDown={onKeyDown}>
      <div className="animate-fade absolute inset-0 bg-black/30" onClick={close} />
      <div className="animate-pop relative flex max-h-[75dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={17} className="shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Искать папки, заметки, задачи, события…"
            className="h-13 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
            aria-label="Поиск"
          />
          <button onClick={close} aria-label="Закрыть" className="text-faint hover:text-fg">
            <X size={17} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
          {TAG_KEYS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] transition-colors",
                  on ? cn(TAGS[t].className, "border-transparent") : "border-line text-muted hover:bg-hover"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", TAGS[t].dot)} />
                {TAGS[t].label}
              </button>
            );
          })}
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
          {!hasInput && (
            <p className="px-3 py-8 text-center text-sm text-faint">
              Начните вводить запрос — поиск идёт и по содержимому заметок.
              <br />
              Или выберите тег, чтобы увидеть все отмеченные заметки.
            </p>
          )}
          {hasInput && rows.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted">Ничего не найдено</p>
          )}
          {rows.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <div key={r.group + r.key}>
                {header && (
                  <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
                    {header}
                  </div>
                )}
                <button
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={r.onSelect}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                    i === active && "bg-hover"
                  )}
                >
                  {r.icon}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{r.title}</span>
                    {r.subtitle && (
                      <span className="block truncate text-[12px] text-muted">{r.subtitle}</span>
                    )}
                  </span>
                  {i === active && <CornerDownLeft size={14} className="shrink-0 text-faint" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-faint sm:flex">
          <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> выбор</span>
          <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> открыть</span>
          <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> закрыть</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
