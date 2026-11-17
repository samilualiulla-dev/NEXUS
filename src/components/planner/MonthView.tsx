"use client";

import { isSameMonth } from "date-fns";
import { Plus } from "lucide-react";
import { monthGrid, toKey, todayKey, WEEKDAY_SHORT } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { PlanCard, useDayDrop, type PlanItem } from "./planItems";

const MAX_VISIBLE = 3;

export function MonthView({
  date,
  items,
  onOpenDay,
}: {
  date: Date;
  items: Map<string, PlanItem[]>;
  onOpenDay: (key: string) => void;
}) {
  const days = monthGrid(date);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line bg-surface-2/50">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="py-2 text-center text-[11.5px] font-medium uppercase text-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => (
          <Cell
            key={toKey(d)}
            dayKey={toKey(d)}
            date={d}
            inMonth={isSameMonth(d, date)}
            items={items.get(toKey(d)) ?? []}
            onOpenDay={onOpenDay}
            borderRight={(i + 1) % 7 !== 0}
            borderBottom={i < days.length - 7}
          />
        ))}
      </div>
    </div>
  );
}

function Cell({
  dayKey,
  date,
  inMonth,
  items,
  onOpenDay,
  borderRight,
  borderBottom,
}: {
  dayKey: string;
  date: Date;
  inMonth: boolean;
  items: PlanItem[];
  onOpenDay: (key: string) => void;
  borderRight: boolean;
  borderBottom: boolean;
}) {
  const { editEvent } = useApp();
  const { over, props } = useDayDrop(dayKey);
  const isToday = dayKey === todayKey();
  const extra = items.length - MAX_VISIBLE;

  return (
    <div
      {...props}
      className={cn(
        "group flex min-h-20 min-w-0 flex-col gap-0.5 p-1 sm:min-h-28 sm:p-1.5",
        borderRight && "border-r border-line",
        borderBottom && "border-b border-line",
        !inMonth && "bg-surface-2/50",
        over && "bg-accent-soft"
      )}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => onOpenDay(dayKey)}
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] hover:bg-hover",
            !inMonth && "text-faint",
            isToday && "bg-accent font-semibold text-white hover:bg-accent"
          )}
          aria-label="Открыть день"
        >
          {date.getDate()}
        </button>
        <button
          onClick={() => editEvent({ defaults: { date: dayKey } })}
          className="hidden h-5 w-5 items-center justify-center rounded text-faint hover:bg-hover hover:text-fg group-hover:flex"
          aria-label={`Добавить на ${date.getDate()}`}
        >
          <Plus size={12} />
        </button>
      </div>
      {/* Desktop: compact cards; mobile: dots */}
      <div className="hidden flex-col gap-0.5 sm:flex">
        {items.slice(0, MAX_VISIBLE).map((it) => (
          <PlanCard key={it.kind + it.id} item={it} compact />
        ))}
        {extra > 0 && (
          <button onClick={() => onOpenDay(dayKey)} className="px-1 text-left text-[11px] text-muted hover:text-fg">
            ещё {extra}
          </button>
        )}
      </div>
      {items.length > 0 && (
        <button onClick={() => onOpenDay(dayKey)} className="flex flex-wrap gap-0.5 px-1 sm:hidden" aria-label={`${items.length} дел`}>
          {items.slice(0, 6).map((it) => (
            <span key={it.kind + it.id} className={cn("h-1.5 w-1.5 rounded-full", it.kind === "task" ? "bg-faint" : "bg-accent")} />
          ))}
        </button>
      )}
    </div>
  );
}
