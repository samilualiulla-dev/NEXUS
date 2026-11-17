"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays } from "date-fns";
import { ArrowRight, CalendarDays, CheckSquare, FilePlus, FileText, FolderPlus, Plus, Search } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { db } from "@/lib/db";
import { childrenOf, pathLabel } from "@/lib/tree";
import { isOverdue, sortTasks } from "@/lib/tasks";
import { sortEvents } from "@/lib/events";
import { capitalize, fmt, relativeDay, toKey, todayKey } from "@/lib/dates";
import { useApp } from "@/components/providers/AppContext";
import { Button, Card, EmptyState, Kbd, SectionTitle } from "@/components/ui/primitives";
import { TaskRow } from "@/components/tasks/TaskRow";
import { PlanCard } from "@/components/planner/planItems";
import { NodeIcon } from "@/components/knowledge/NodeIcon";
import { TagDots } from "@/components/knowledge/TagPicker";
import { nodeHref, useNodeActions } from "@/components/knowledge/useNodeActions";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export default function Dashboard() {
  const { nodes, setSearchOpen, editTask, editEvent } = useApp();
  const actions = useNodeActions();
  const today = todayKey();
  const weekAhead = toKey(addDays(new Date(), 7));

  const todayEvents = useLiveQuery(() => db.events.where("date").equals(today).toArray().then((l) => l.sort(sortEvents)), [today]);
  const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.done).toArray(), []);
  const upcomingEvents = useLiveQuery(
    () =>
      db.events
        .where("date")
        .between(toKey(addDays(new Date(), 1)), weekAhead, true, true)
        .toArray()
        .then((l) => l.sort((a, b) => (a.date === b.date ? sortEvents(a, b) : a.date < b.date ? -1 : 1)).slice(0, 8)),
    [weekAhead]
  );

  const todayTasks = (tasks ?? []).filter((t) => t.dueDate === today || isOverdue(t, today)).sort(sortTasks);
  const upcomingTasks = (tasks ?? [])
    .filter((t) => t.dueDate && t.dueDate > today && t.dueDate <= weekAhead)
    .sort(sortTasks)
    .slice(0, 6);

  const recentNotes = nodes
    .filter((n) => n.type === "note")
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);
  const roots = childrenOf(nodes, null).filter((n) => n.type === "folder");

  const doneToday = useLiveQuery(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return db.tasks.filter((t) => t.done && (t.completedAt ?? 0) >= start.getTime()).count();
  }, []);

  return (
    <div className="page-enter mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-muted">{capitalize(fmt(new Date(), "EEEE, d MMMM"))}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{greeting()}</h1>
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-sm text-faint shadow-sm transition-colors hover:border-line-strong sm:w-80"
        >
          <Search size={16} />
          <span className="flex-1 text-left">Найти тему, заметку, задачу…</span>
          <Kbd>Ctrl K</Kbd>
        </button>
      </div>

      {nodes.length === 0 && (
        <Card className="mb-8 p-6">
          <h2 className="text-base font-semibold">Добро пожаловать в {APP_CONFIG.name}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Начните с папки верхнего уровня (например, «Учёба»), внутри создайте предметы, разделы и темы —
            вложенность не ограничена. Все данные сохраняются в этом браузере.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" icon={FolderPlus} onClick={() => actions.createFolder(null)}>
              Создать папку
            </Button>
            <Button icon={FilePlus} onClick={() => actions.createNote(null)}>
              Создать заметку
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today */}
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            action={
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => editEvent({ defaults: { date: today } })}>
                  Дело
                </Button>
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => editTask({ defaults: { dueDate: today } })}>
                  Задача
                </Button>
              </div>
            }
          >
            Сегодня {doneToday ? `· выполнено ${doneToday}` : ""}
          </SectionTitle>
          {!todayEvents?.length && !todayTasks.length ? (
            <EmptyState icon={CalendarDays} title="На сегодня ничего не запланировано" text="Добавьте дело или задачу — или откройте планер недели." />
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[12px] font-medium text-faint">Расписание</p>
                <div className="flex flex-col gap-1.5">
                  {todayEvents?.length ? (
                    todayEvents.map((e) => (
                      <PlanCard key={e.id} item={{ kind: "event", id: e.id, date: e.date, event: e }} />
                    ))
                  ) : (
                    <p className="text-[13px] text-faint">Нет дел</p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-medium text-faint">Задачи</p>
                <div className="-mx-3">
                  {todayTasks.length ? (
                    todayTasks.map((t) => <TaskRow key={t.id} task={t} />)
                  ) : (
                    <p className="px-3 text-[13px] text-faint">Нет задач</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <Link href="/planner" className="mt-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
            Открыть планер <ArrowRight size={13} />
          </Link>
        </Card>

        {/* Upcoming */}
        <Card className="p-5">
          <SectionTitle>Ближайшие 7 дней</SectionTitle>
          {!upcomingEvents?.length && !upcomingTasks.length ? (
            <p className="text-[13px] text-faint">Ничего не запланировано</p>
          ) : (
            <div className="flex flex-col gap-1">
              {upcomingEvents?.map((e) => (
                <Link
                  key={e.id}
                  href={`/planner?view=day&date=${e.date}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-hover/60"
                >
                  <CalendarDays size={14} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                  <span className="shrink-0 text-[12px] text-muted">
                    {relativeDay(e.date)} {e.start ?? ""}
                  </span>
                </Link>
              ))}
              {upcomingTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => editTask({ task: t })}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-hover/60"
                >
                  <CheckSquare size={14} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                  <span className="shrink-0 text-[12px] text-muted">{relativeDay(t.dueDate!)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Recent notes */}
        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Недавно изменённые</SectionTitle>
          {recentNotes.length === 0 ? (
            <p className="text-[13px] text-faint">Заметок пока нет</p>
          ) : (
            <div className="grid gap-1 sm:grid-cols-2">
              {recentNotes.map((n) => (
                <Link key={n.id} href={nodeHref(n.id)} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-hover/60">
                  <NodeIcon node={n} size={16} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm">{n.title}</span>
                      <TagDots tags={n.tags} />
                    </span>
                    <span className="block truncate text-[12px] text-faint">
                      {pathLabel(nodes, n.parentId ?? "") || "Корень"} · {fmt(new Date(n.updatedAt), "d MMM, HH:mm")}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Quick access */}
        <Card className="p-5">
          <SectionTitle
            action={
              <Button size="sm" variant="ghost" icon={Plus} onClick={() => actions.createFolder(null)}>
                Папка
              </Button>
            }
          >
            Быстрый доступ
          </SectionTitle>
          {roots.length === 0 ? (
            <p className="text-[13px] text-faint">Создайте первую папку</p>
          ) : (
            <div className="flex flex-col gap-3">
              {roots.slice(0, 6).map((r) => {
                const subs = childrenOf(nodes, r.id);
                return (
                  <div key={r.id}>
                    <Link href={nodeHref(r.id)} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium hover:bg-hover/60">
                      <NodeIcon node={r} size={15} />
                      <span className="truncate">{r.title}</span>
                      <span className="ml-auto text-[12px] font-normal text-faint">{subs.length}</span>
                    </Link>
                    {subs.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5 pl-2">
                        {subs.slice(0, 8).map((s) => (
                          <Link
                            key={s.id}
                            href={nodeHref(s.id)}
                            className="flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-[12px] text-muted hover:border-line-strong hover:text-fg"
                          >
                            {s.type === "note" && <FileText size={11} />}
                            {s.icon && <span>{s.icon}</span>}
                            {s.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
