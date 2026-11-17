"use client";

import Link from "next/link";
import { Calendar, Check, FolderClosed } from "lucide-react";
import type { Task } from "@/lib/db";
import { isOverdue, toggleTask } from "@/lib/tasks";
import { relativeDay } from "@/lib/dates";
import { PRIORITIES } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { nodeHref } from "@/components/knowledge/useNodeActions";

export function CheckCircle({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all",
        checked
          ? "border-ok bg-ok text-white"
          : "border-line-strong text-transparent hover:border-muted hover:text-faint"
      )}
    >
      <Check size={11} strokeWidth={3} />
    </button>
  );
}

export function TaskRow({ task, showNode = true }: { task: Task; showNode?: boolean }) {
  const { editTask, nodes } = useApp();
  const node = task.nodeId ? nodes.find((n) => n.id === task.nodeId) : undefined;
  const overdue = isOverdue(task);

  return (
    <div
      onClick={() => editTask({ task })}
      className="group flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-hover/60"
    >
      <div className="pt-px">
        <CheckCircle
          checked={task.done}
          onToggle={() => toggleTask(task)}
          label={task.done ? "Отметить как невыполненную" : "Отметить выполненной"}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", task.done && "text-faint line-through")}>{task.title}</p>
        {(task.dueDate || task.category || node || task.priority === "high") && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
            {task.dueDate && (
              <span className={cn("flex items-center gap-1", overdue && "font-medium text-danger")}>
                <Calendar size={12} />
                {overdue ? "Просрочено · " : ""}
                {relativeDay(task.dueDate)}
              </span>
            )}
            {task.category && <span>#{task.category}</span>}
            {showNode && node && (
              <Link
                href={nodeHref(node.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-fg hover:underline"
              >
                <FolderClosed size={12} />
                {node.title}
              </Link>
            )}
          </div>
        )}
      </div>
      <span
        title={`Приоритет: ${PRIORITIES[task.priority].label}`}
        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", PRIORITIES[task.priority].dot)}
      />
    </div>
  );
}
