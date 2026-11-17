"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { CalendarEvent } from "@/lib/db";
import { timeToMinutes, todayKey } from "@/lib/dates";
import { timeRange, updateEvent } from "@/lib/events";
import { PRIORITIES } from "@/lib/labels";
import { APP_CONFIG } from "@/config/app";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { CheckCircle } from "@/components/tasks/TaskRow";
import { PlanCard, planDragProps, useDayDrop, type PlanItem } from "./planItems";

const HOUR_PX = 56;

/** Assigns side-by-side columns to overlapping events. */
function layout(events: CalendarEvent[]) {
  type Box = { ev: CalendarEvent; start: number; end: number; col: number; cols: number };
  const boxes: Box[] = events
    .map((ev) => {
      const start = timeToMinutes(ev.start)!;
      const end = Math.max(timeToMinutes(ev.end) ?? start + 60, start + 30);
      return { ev, start, end, col: 0, cols: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  let cluster: Box[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((b) => b.col + 1));
    cluster.forEach((b) => (b.cols = cols));
    cluster = [];
  };
  for (const b of boxes) {
    if (b.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const used = new Set(cluster.filter((c) => c.end > b.start).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    b.col = col;
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  flush();
  return boxes;
}

export function DayView({ dayKey, items }: { dayKey: string; items: PlanItem[] }) {
  const { editEvent, editTask } = useApp();
  const drop = useDayDrop(dayKey);
  const scrollRef = useRef<HTMLDivElement>(null);

  const timed = items.filter(
    (i): i is Extract<PlanItem, { kind: "event" }> => i.kind === "event" && !!i.event.start
  );
  const untimed = items.filter((i) => !(i.kind === "event" && i.event.start));

  const earliest = Math.min(
    APP_CONFIG.dayStartHour,
    ...timed.map((t) => Math.floor(timeToMinutes(t.event.start)! / 60))
  );
  const startHour = Math.max(0, earliest);
  const endHour = APP_CONFIG.dayEndHour;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const boxes = layout(timed.map((t) => t.event));

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const isToday = dayKey === todayKey();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Scroll to the current time / first event.
  useEffect(() => {
    const target = isToday ? nowMin : boxes[0]?.start ?? 8 * 60;
    scrollRef.current?.scrollTo({ top: Math.max(0, ((target - startHour * 60) / 60) * HOUR_PX - 80) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  const add = (hour?: number) =>
    editEvent({
      defaults: {
        date: dayKey,
        start: hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : undefined,
        end: hour !== undefined && hour < 23 ? `${String(hour + 1).padStart(2, "0")}:00` : undefined,
      },
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      {/* Timeline */}
      <div
        ref={scrollRef}
        {...drop.props}
        className={cn(
          "relative max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface",
          drop.over && "ring-1 ring-accent"
        )}
      >
        <div className="relative" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((h, i) => (
            <button
              key={h}
              onClick={() => add(h)}
              className="group absolute inset-x-0 flex border-b border-line/70 text-left hover:bg-hover/40"
              style={{ top: i * HOUR_PX, height: HOUR_PX }}
              aria-label={`Добавить в ${h}:00`}
            >
              <span className="w-14 shrink-0 -translate-y-2 pr-2 text-right font-mono text-[11px] text-faint tabular-nums">
                {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
              <span className="flex flex-1 items-center pl-2 text-[12px] text-faint opacity-0 group-hover:opacity-100">
                <Plus size={12} className="mr-1" /> {String(h).padStart(2, "0")}:00
              </span>
            </button>
          ))}

          {isToday && nowMin >= startHour * 60 && (
            <div
              className="pointer-events-none absolute left-12 right-0 z-10 flex items-center"
              style={{ top: ((nowMin - startHour * 60) / 60) * HOUR_PX }}
            >
              <span className="h-2 w-2 -translate-x-1 rounded-full bg-danger" />
              <span className="h-px flex-1 bg-danger" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-y-0 left-14 right-2">
            {boxes.map((b) => {
              const top = ((b.start - startHour * 60) / 60) * HOUR_PX;
              const height = Math.max(((b.end - b.start) / 60) * HOUR_PX - 2, 24);
              const item: PlanItem = { kind: "event", id: b.ev.id, date: b.ev.date, event: b.ev };
              return (
                <div
                  key={b.ev.id}
                  {...planDragProps(item)}
                  onClick={() => editEvent({ event: b.ev })}
                  className={cn(
                    "pointer-events-auto absolute cursor-pointer overflow-hidden rounded-md border border-line bg-accent-soft px-2 py-1 text-[12.5px] shadow-sm transition-shadow hover:shadow-md",
                    b.ev.done && "opacity-60"
                  )}
                  style={{
                    top: top + 1,
                    height,
                    left: `calc(${(b.col / b.cols) * 100}% + 2px)`,
                    width: `calc(${100 / b.cols}% - 4px)`,
                  }}
                >
                  <span className={cn("absolute inset-y-0 left-0 w-[3px]", PRIORITIES[b.ev.priority].dot)} />
                  <div className="flex items-start gap-1.5">
                    <span className="pt-px" onClick={(e) => e.stopPropagation()}>
                      <CheckCircle
                        checked={b.ev.done}
                        onToggle={() => updateEvent(b.ev.id, { done: !b.ev.done })}
                        label="Выполнено"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate font-medium", b.ev.done && "line-through")}>{b.ev.title}</p>
                      <p className="truncate font-mono text-[11px] text-muted">{timeRange(b.ev)}</p>
                      {height > 60 && b.ev.description && (
                        <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted">{b.ev.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Without time + tasks */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-muted">Без времени и задачи</h3>
          <div className="flex gap-1">
            <button onClick={() => add()} className="rounded-md px-2 py-1 text-[12px] text-muted hover:bg-hover hover:text-fg">
              + Дело
            </button>
            <button
              onClick={() => editTask({ defaults: { dueDate: dayKey } })}
              className="rounded-md px-2 py-1 text-[12px] text-muted hover:bg-hover hover:text-fg"
            >
              + Задача
            </button>
          </div>
        </div>
        {untimed.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-faint">
            Нажмите на час слева, чтобы запланировать дело на это время
          </p>
        ) : (
          untimed.map((it) => <PlanCard key={it.kind + it.id} item={it} />)
        )}
      </div>
    </div>
  );
}
