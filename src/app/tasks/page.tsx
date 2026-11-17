"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, startOfWeek } from "date-fns";
import { CheckSquare, Plus, Search } from "lucide-react";
import { db, type Priority, type Task } from "@/lib/db";
import { createTask, isOverdue, sortTasks } from "@/lib/tasks";
import { toKey, todayKey } from "@/lib/dates";
import { PRIORITIES, PRIORITY_KEYS } from "@/lib/labels";
import { normalize } from "@/lib/search";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui/primitives";
import { TaskRow } from "@/components/tasks/TaskRow";

type Filter = "active" | "today" | "upcoming" | "overdue" | "done" | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "active", label: "Активные" },
  { key: "today", label: "Сегодня" },
  { key: "upcoming", label: "Предстоящие" },
  { key: "overdue", label: "Просроченные" },
  { key: "done", label: "Выполненные" },
  { key: "all", label: "Все" },
];

export default function TasksPage() {
  const { editTask, nodes } = useApp();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const [filter, setFilter] = useState<Filter>("active");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [nodeFilter, setNodeFilter] = useState("");
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState("");

  const today = todayKey();
  const all = useMemo(() => tasks ?? [], [tasks]);
  const categories = [...new Set(all.map((t) => t.category).filter(Boolean))] as string[];
  const linkedNodes = [...new Set(all.map((t) => t.nodeId).filter(Boolean))]
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean);

  const stats = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
    const done = all.filter((t) => t.done);
    return {
      total: all.length,
      done: done.length,
      active: all.length - done.length,
      overdue: all.filter((t) => isOverdue(t, today)).length,
      today: all.filter((t) => !t.done && t.dueDate === today).length,
      doneThisWeek: done.filter((t) => (t.completedAt ?? 0) >= weekStart).length,
      pct: all.length ? Math.round((done.length / all.length) * 100) : 0,
    };
  }, [all, today]);

  const byCategory = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    for (const t of all) {
      const k = t.category || "Без категории";
      const v = m.get(k) ?? { total: 0, done: 0 };
      v.total++;
      if (t.done) v.done++;
      m.set(k, v);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6);
  }, [all]);

  const visible = useMemo(() => {
    const week = toKey(addDays(new Date(), 7));
    const q = normalize(query.trim());
    return all
      .filter((t) => {
        switch (filter) {
          case "active": return !t.done;
          case "today": return !t.done && t.dueDate === today;
          case "upcoming": return !t.done && !!t.dueDate && t.dueDate > today && t.dueDate <= week;
          case "overdue": return isOverdue(t, today);
          case "done": return t.done;
          default: return true;
        }
      })
      .filter((t) => !category || t.category === category)
      .filter((t) => !priority || t.priority === priority)
      .filter((t) => !nodeFilter || t.nodeId === nodeFilter)
      .filter((t) => !q || normalize(`${t.title} ${t.description ?? ""}`).includes(q))
      .sort(
        filter === "done"
          ? (a: Task, b: Task) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
          : sortTasks
      );
  }, [all, filter, category, priority, nodeFilter, query, today]);

  const addQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quick.trim();
    if (!title) return;
    setQuick("");
    await createTask({
      title,
      priority: "medium",
      dueDate: filter === "today" ? today : undefined,
      category: category || undefined,
      nodeId: nodeFilter || undefined,
    });
  };

  return (
    <div className="page-enter mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-8 sm:pt-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Задачи</h1>
          <p className="text-[13px] text-muted">Дедлайны, приоритеты и прогресс</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => editTask({ defaults: { nodeId: nodeFilter || undefined, category: category || undefined } })}>
          Новая задача
        </Button>
      </div>

      {/* Progress dashboard */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4 sm:col-span-2 lg:col-span-1 lg:row-span-2">
          <p className="text-[12px] font-medium text-muted">Общий прогресс</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{stats.pct}%</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-ok transition-all duration-500" style={{ width: `${stats.pct}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-muted">
            {stats.done} из {stats.total} выполнено
          </p>
          {byCategory.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
              {byCategory.map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-[12px]">
                    <span className="truncate text-muted">{k}</span>
                    <span className="tabular-nums text-faint">
                      {v.done}/{v.total}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(v.done / v.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Stat label="Активные" value={stats.active} onClick={() => setFilter("active")} />
        <Stat label="На сегодня" value={stats.today} onClick={() => setFilter("today")} />
        <Stat label="Просрочено" value={stats.overdue} tone={stats.overdue ? "danger" : undefined} onClick={() => setFilter("overdue")} />
        <Stat label="Выполнено за неделю" value={stats.doneThisWeek} tone="ok" onClick={() => setFilter("done")} />
      </div>

      {/* Filters */}
      <div className="mb-3 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-[13px] transition-colors",
              filter === f.key ? "border-fg font-medium text-fg" : "border-transparent text-muted hover:text-fg"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="relative col-span-2 sm:col-span-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Фильтр" className="pl-8" aria-label="Фильтр по тексту" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Категория">
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority | "")} aria-label="Приоритет">
          <option value="">Любой приоритет</option>
          {PRIORITY_KEYS.map((p) => (
            <option key={p} value={p}>{PRIORITIES[p].label}</option>
          ))}
        </Select>
        <Select value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)} aria-label="Предмет">
          <option value="">Все предметы</option>
          {linkedNodes.map((n) => (
            <option key={n!.id} value={n!.id}>{n!.title}</option>
          ))}
        </Select>
      </div>

      <form onSubmit={addQuick} className="mb-3 flex gap-2">
        <Input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder={filter === "today" ? "Быстро добавить задачу на сегодня…" : "Быстро добавить задачу…"}
          aria-label="Быстрое добавление"
        />
        <Button type="submit" icon={Plus} disabled={!quick.trim()}>
          <span className="hidden sm:inline">Добавить</span>
        </Button>
      </form>

      <Card className="p-1">
        {tasks && visible.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={CheckSquare} title="Задач нет" text="Добавьте задачу или измените фильтр." />
          </div>
        ) : (
          visible.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "danger" | "ok";
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "danger" && "text-danger",
          tone === "ok" && "text-ok"
        )}
      >
        {value}
      </p>
    </button>
  );
}
