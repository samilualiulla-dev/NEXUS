"use client";

import { Plus } from "lucide-react";
import { fmt, toKey, todayKey, weekDays, WEEKDAY_SHORT } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { PlanCard, useDayDrop, type PlanItem } from "./planItems";

export function WeekView({
  date,
  items,
  onOpenDay,
}: {
  date: Date;
  items: Map<string, PlanItem[]>;
  onOpenDay: (key: string) => void;
}) {
  const days = weekDays(date);
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7 md:gap-0 md:overflow-hidden md:rounded-xl md:border md:border-line">
      {days.map((d, i) => (
        <DayColumn
          key={toKey(d)}
          dayKey={toKey(d)}
          label={WEEKDAY_SHORT[i]}
          date={d}
          items={items.get(toKey(d)) ?? []}
          onOpenDay={onOpenDay}
          last={i === 6}
        />
      ))}
    </div>
  );
}

function DayColumn({
  dayKey,
  label,
  date,
  items,
  onOpenDay,
  last,
}: {
  dayKey: string;
  label: string;
  date: Date;
  items: PlanItem[];
  onOpenDay: (key: string) => void;
  last: boolean;
}) {
  const { editEvent } = useApp();
  const { over, props } = useDayDrop(dayKey);
  const isToday = dayKey === todayKey();
  const weekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      {...props}
      className={cn(
        "group flex min-h-24 flex-col rounded-xl border border-line bg-surface transition-colors md:min-h-[60vh] md:rounded-none md:border-0",
        !last && "md:border-r md:border-line",
        weekend && "md:bg-surface-2/40",
        over && "bg-accent-soft! ring-1 ring-inset ring-accent"
      )}
    >
      <button
        onClick={() => onOpenDay(dayKey)}
        className="flex items-center gap-2 border-b border-line px-3 py-2 text-left hover:bg-hover/60 md:flex-col md:items-start md:gap-0"
        title="Открыть день"
      >
        <span className={cn("text-[12px] font-medium uppercase text-muted", isToday && "text-accent")}>{label}</span>
        <span
          className={cn(
            "text-[15px] font-semibold md:text-xl",
            isToday && "text-accent"
          )}
        >
          {date.getDate()}
          <span className="ml-1 text-[12px] font-normal text-muted md:hidden">{fmt(date, "MMMM")}</span>
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        {items.map((it) => (
          <PlanCard key={it.kind + it.id} item={it} />
        ))}
        <button
          onClick={() => editEvent({ defaults: { date: dayKey } })}
          aria-label={`Добавить на ${fmt(date, "d MMMM")}`}
          className="mt-auto flex h-7 items-center justify-center gap-1 rounded-md text-[12px] text-faint opacity-100 transition-opacity hover:bg-hover hover:text-fg md:opacity-0 md:group-hover:opacity-100"
        >
          <Plus size={13} /> Добавить
        </button>
      </div>
    </div>
  );
}
