"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { sortTasks } from "@/lib/tasks";
import { sortEvents, timeRange } from "@/lib/events";
import { fmt, todayKey } from "@/lib/dates";
import { useApp } from "@/components/providers/AppContext";
import { Button, SectionTitle } from "@/components/ui/primitives";
import { TaskRow } from "@/components/tasks/TaskRow";

/** Tasks and upcoming planner items linked to a folder/note subtree. */
export function LinkedItems({ nodeId, subtreeIds }: { nodeId: string; subtreeIds: string[] }) {
  const { editTask } = useApp();
  const key = subtreeIds.join(",");
  const tasks = useLiveQuery(
    async () => (await db.tasks.where("nodeId").anyOf(subtreeIds).toArray()).sort(sortTasks),
    [key]
  );
  const events = useLiveQuery(
    async () =>
      (await db.events.where("nodeId").anyOf(subtreeIds).toArray())
        .filter((e) => e.date >= todayKey())
        .sort((a, b) => (a.date === b.date ? sortEvents(a, b) : a.date < b.date ? -1 : 1))
        .slice(0, 5),
    [key]
  );

  const open = tasks?.filter((t) => !t.done) ?? [];
  const done = tasks?.filter((t) => t.done) ?? [];

  return (
    <section className="mt-10 grid gap-8 md:grid-cols-2">
      <div>
        <SectionTitle
          action={
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => editTask({ defaults: { nodeId } })}>
              Задача
            </Button>
          }
        >
          Задачи {tasks?.length ? `· ${done.length}/${tasks.length}` : ""}
        </SectionTitle>
        {open.length === 0 && done.length === 0 ? (
          <p className="px-3 text-[13px] text-faint">Нет связанных задач</p>
        ) : (
          <div className="-mx-3">
            {[...open, ...done].slice(0, 8).map((t) => (
              <TaskRow key={t.id} task={t} showNode={t.nodeId !== nodeId} />
            ))}
          </div>
        )}
      </div>
      <div>
        <SectionTitle>В планере</SectionTitle>
        {!events?.length ? (
          <p className="px-3 text-[13px] text-faint">Нет запланированных дел</p>
        ) : (
          <div className="flex flex-col gap-1">
            {events.map((e) => (
              <Link
                key={e.id}
                href={`/planner?view=day&date=${e.date}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-hover/60"
              >
                <CalendarDays size={15} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="shrink-0 text-[12px] text-muted">
                  {fmt(e.date, "d MMM")} {timeRange(e)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
