"use client";

import { useState } from "react";
import { addMonths, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { capitalize, fmt, fromKey, monthGrid, toKey, todayKey, WEEKDAY_SHORT } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/primitives";

/** Small month calendar for picking any date. */
export function MiniCalendar({
  selected,
  onSelect,
  marked,
}: {
  selected: string;
  onSelect: (key: string) => void;
  marked?: Set<string>;
}) {
  const [month, setMonth] = useState(() => fromKey(selected));
  const [prev, setPrev] = useState(selected);
  if (selected !== prev) {
    setPrev(selected);
    setMonth(fromKey(selected));
  }
  const today = todayKey();

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <span className="pl-1 text-[13px] font-semibold">{capitalize(fmt(month, "LLLL yyyy"))}</span>
        <div className="flex">
          <IconButton icon={ChevronLeft} label="Предыдущий месяц" onClick={() => setMonth(addMonths(month, -1))} />
          <IconButton icon={ChevronRight} label="Следующий месяц" onClick={() => setMonth(addMonths(month, 1))} />
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-faint">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {monthGrid(month).map((d) => {
          const key = toKey(d);
          const isSel = key === selected;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              aria-label={fmt(d, "d MMMM yyyy")}
              aria-pressed={isSel}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12.5px] transition-colors",
                !isSameMonth(d, month) && "text-faint",
                isSel ? "bg-fg font-semibold text-bg" : "hover:bg-hover",
                !isSel && key === today && "font-semibold text-accent"
              )}
            >
              {d.getDate()}
              {marked?.has(key) && !isSel && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
