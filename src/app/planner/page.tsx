"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addDays, addMonths, addWeeks, endOfMonth, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { capitalize, fmt, fromKey, monthGrid, toKey, todayKey, weekDays } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { Button, IconButton } from "@/components/ui/primitives";
import { MiniCalendar } from "@/components/planner/MiniCalendar";
import { usePlanItems } from "@/components/planner/planItems";
import { DayView } from "@/components/planner/DayView";
import { WeekView } from "@/components/planner/WeekView";
import { MonthView } from "@/components/planner/MonthView";

type View = "day" | "week" | "month";
const VIEWS: { key: View; label: string }[] = [
  { key: "day", label: "День" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
];

export default function PlannerPage() {
  return (
    <Suspense>
      <Planner />
    </Suspense>
  );
}

function Planner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { editEvent } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);

  // State lives in the URL (?view=week&date=2026-11-17) so links and search can open any day.
  const view = (params.get("view") as View) || (localStorage.getItem("nexus-planner-view") as View) || "week";
  const dateKey = params.get("date") || todayKey();
  const date = fromKey(dateKey);

  const go = (v: View, d: string) => {
    localStorage.setItem("nexus-planner-view", v);
    router.replace(`${pathname}?view=${v}&date=${d}`, { scroll: false });
  };

  const range = useMemo(() => {
    if (view === "day") return [dateKey, dateKey];
    if (view === "week") {
      const days = weekDays(date);
      return [toKey(days[0]), toKey(days[6])];
    }
    const g = monthGrid(date);
    return [toKey(g[0]), toKey(g[g.length - 1])];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dateKey]);

  const items = usePlanItems(range[0], range[1]);
  // Dots in the mini calendar for the visible month
  const monthItems = usePlanItems(toKey(startOfMonth(date)), toKey(endOfMonth(date)));
  const marked = useMemo(() => new Set(monthItems ? [...monthItems.keys()] : []), [monthItems]);

  const step = (dir: 1 | -1) => {
    const next = view === "day" ? addDays(date, dir) : view === "week" ? addWeeks(date, dir) : addMonths(date, dir);
    go(view, toKey(next));
  };

  const title = (() => {
    if (view === "day") return capitalize(fmt(date, "EEEE, d MMMM yyyy"));
    if (view === "month") return capitalize(fmt(date, "LLLL yyyy"));
    const d = weekDays(date);
    const sameMonth = d[0].getMonth() === d[6].getMonth();
    return sameMonth
      ? `${d[0].getDate()}–${fmt(d[6], "d MMMM yyyy")}`
      : `${fmt(d[0], "d MMM")} – ${fmt(d[6], "d MMM yyyy")}`;
  })();

  const total = items ? [...items.values()].reduce((s, l) => s + l.length, 0) : 0;

  return (
    <div className="page-enter mx-auto w-full max-w-[1400px] px-4 pb-12 pt-5 sm:px-6 sm:pt-7">
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="mr-auto min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <p className="text-[13px] text-muted">
            Планер · {total} {view === "day" ? "на этот день" : view === "week" ? "на этой неделе" : "в этом месяце"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <IconButton icon={ChevronLeft} label="Назад" onClick={() => step(-1)} />
          <Button size="sm" onClick={() => go(view, todayKey())}>
            Сегодня
          </Button>
          <IconButton icon={ChevronRight} label="Вперёд" onClick={() => step(1)} />
          <IconButton
            icon={CalendarDays}
            label="Выбрать дату"
            active={pickerOpen}
            className="xl:hidden"
            onClick={() => setPickerOpen((v) => !v)}
          />
        </div>

        <div className="flex rounded-lg border border-line bg-surface-2 p-0.5" role="tablist">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              role="tab"
              aria-selected={view === v.key}
              onClick={() => go(v.key, dateKey)}
              className={cn(
                "rounded-md px-3 py-1 text-[13px] transition-colors",
                view === v.key ? "bg-surface font-medium text-fg shadow-sm" : "text-muted hover:text-fg"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => editEvent({ defaults: { date: dateKey } })}>
          Добавить
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Date picker: side panel on wide screens, toggle on smaller */}
        <aside
          className={cn(
            "w-full shrink-0 rounded-xl border border-line bg-surface p-3 xl:block xl:w-64 xl:self-start",
            pickerOpen ? "fixed inset-x-4 top-28 z-30 block shadow-pop xl:static xl:shadow-none" : "hidden"
          )}
        >
          <MiniCalendar
            selected={dateKey}
            marked={marked}
            onSelect={(k) => {
              setPickerOpen(false);
              go(view, k);
            }}
          />
          <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-faint">
            Перетаскивайте дела и задачи между днями. Нажмите на день, чтобы открыть подробное расписание.
          </p>
        </aside>

        <div className="min-w-0 flex-1">
          {!items ? (
            <div className="h-96 animate-pulse rounded-xl bg-hover/50" />
          ) : view === "day" ? (
            <DayView dayKey={dateKey} items={items.get(dateKey) ?? []} />
          ) : view === "week" ? (
            <WeekView date={date} items={items} onOpenDay={(k) => go("day", k)} />
          ) : (
            <MonthView date={date} items={items} onOpenDay={(k) => go("day", k)} />
          )}
        </div>
      </div>
    </div>
  );
}
