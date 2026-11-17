"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckSquare } from "lucide-react";
import { db, type CalendarEvent, type Task } from "@/lib/db";
import { sortEvents, timeRange, updateEvent } from "@/lib/events";
import { PRIORITY_RANK, toggleTask, updateTask } from "@/lib/tasks";
import { PRIORITIES } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { CheckCircle } from "@/components/tasks/TaskRow";

export type PlanItem =
  | { kind: "event"; id: string; date: string; event: CalendarEvent }
  | { kind: "task"; id: string; date: string; task: Task };

/** Events + tasks with a due date inside [from, to], grouped by day. */
export function usePlanItems(from: string, to: string) {
  return useLiveQuery(
    async () => {
      const [events, tasks] = await Promise.all([
        db.events.where("date").between(from, to, true, true).toArray(),
        db.tasks.where("dueDate").between(from, to, true, true).toArray(),
      ]);
      const byDay = new Map<string, PlanItem[]>();
      const push = (it: PlanItem) => {
        const list = byDay.get(it.date) ?? [];
        list.push(it);
        byDay.set(it.date, list);
      };
      events.sort(sortEvents).forEach((e) => push({ kind: "event", id: e.id, date: e.date, event: e }));
      tasks
        .sort((a, b) => Number(a.done) - Number(b.done) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
        .forEach((t) => push({ kind: "task", id: t.id, date: t.dueDate!, task: t }));
      return byDay;
    },
    [from, to]
  );
}

/* ---------------- Drag & drop between days ---------------- */

const PLAN_MIME = "application/x-nexus-plan";

export function planDragProps(item: PlanItem) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(PLAN_MIME, JSON.stringify({ kind: item.kind, id: item.id }));
      e.dataTransfer.effectAllowed = "move";
    },
  };
}

export function useDayDrop(date: string) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(PLAN_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver(false);
      },
      onDrop: async (e: React.DragEvent) => {
        setOver(false);
        const raw = e.dataTransfer.getData(PLAN_MIME);
        if (!raw) return;
        e.preventDefault();
        const { kind, id } = JSON.parse(raw) as { kind: PlanItem["kind"]; id: string };
        if (kind === "event") await updateEvent(id, { date });
        else await updateTask(id, { dueDate: date });
      },
    },
  };
}

/* ---------------- Card ---------------- */

export function PlanCard({ item, compact }: { item: PlanItem; compact?: boolean }) {
  const { editEvent, editTask } = useApp();

  if (item.kind === "task") {
    const t = item.task;
    return (
      <div
        {...planDragProps(item)}
        onClick={() => editTask({ task: t })}
        className={cn(
          "group flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line-strong bg-surface px-2 transition-colors hover:border-muted",
          compact ? "py-0.5 text-[11.5px]" : "py-1.5 text-[12.5px]"
        )}
        title={t.title}
      >
        {compact ? (
          <CheckSquare size={11} className={cn("shrink-0", t.done ? "text-ok" : "text-faint")} />
        ) : (
          <CheckCircle checked={t.done} onToggle={() => toggleTask(t)} label="Выполнено" />
        )}
        <span className={cn("min-w-0 flex-1 truncate", t.done && "text-faint line-through")}>{t.title}</span>
      </div>
    );
  }

  const e = item.event;
  return (
    <div
      {...planDragProps(item)}
      onClick={() => editEvent({ event: e })}
      title={`${timeRange(e)} ${e.title}`.trim()}
      className={cn(
        "group relative flex cursor-pointer items-start gap-2 overflow-hidden rounded-md border border-line bg-surface pl-2.5 pr-2 transition-colors hover:border-line-strong",
        compact ? "py-0.5 text-[11.5px]" : "py-1.5 text-[12.5px]"
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", PRIORITIES[e.priority].dot)} />
      {!compact && (
        <span className="pt-px">
          <CheckCircle
            checked={e.done}
            onToggle={() => updateEvent(e.id, { done: !e.done })}
            label="Выполнено"
          />
        </span>
      )}
      <span className={cn("min-w-0 flex-1", compact && "truncate")}>
        {e.start && (
          <span
            className={cn(
              "font-mono text-[0.92em] text-muted tabular-nums",
              compact ? "mr-1.5" : "block text-[11px] leading-tight"
            )}
          >
            {compact ? e.start : timeRange(e)}
          </span>
        )}
        <span className={cn("break-words", e.done && "text-faint line-through")}>{e.title}</span>
      </span>
    </div>
  );
}
