"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { db, type Priority, type Task } from "@/lib/db";
import { createTask, deleteTask, updateTask } from "@/lib/tasks";
import { PRIORITIES, PRIORITY_KEYS } from "@/lib/labels";
import { useApp, type TaskEditorState } from "@/components/providers/AppContext";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { NodeSelect } from "@/components/knowledge/NodeSelect";

type Draft = {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  dueDate: string;
  nodeId?: string;
  done: boolean;
};

const toDraft = (t?: Task, d?: Partial<Task>): Draft => ({
  title: t?.title ?? d?.title ?? "",
  description: t?.description ?? d?.description ?? "",
  category: t?.category ?? d?.category ?? "",
  priority: t?.priority ?? d?.priority ?? "medium",
  dueDate: t?.dueDate ?? d?.dueDate ?? "",
  nodeId: t?.nodeId ?? d?.nodeId,
  done: t?.done ?? false,
});

/** Create / edit task dialog (global, opened via useApp().editTask). */
export function TaskDialog() {
  const { taskEditor } = useApp();
  // Remount the form for every opening so it starts from fresh values.
  return taskEditor ? <Form state={taskEditor} /> : null;
}

function Form({ state }: { state: TaskEditorState }) {
  const { editTask, confirm } = useApp();
  const [draft, setDraft] = useState<Draft>(() => toDraft(state.task, state.defaults));
  const categories = useLiveQuery(
    async () => [...new Set((await db.tasks.toArray()).map((t) => t.category).filter(Boolean))] as string[],
    []
  );


  const existing = state.task;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const close = () => editTask(null);

  const save = async () => {
    if (!draft.title.trim()) return;
    const data = {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category.trim() || undefined,
      priority: draft.priority,
      dueDate: draft.dueDate || undefined,
      nodeId: draft.nodeId,
    };
    if (existing) {
      await updateTask(existing.id, {
        ...data,
        done: draft.done,
        completedAt: draft.done ? (existing.completedAt ?? Date.now()) : undefined,
      });
    } else {
      await createTask({ ...data, done: draft.done });
    }
    close();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: "Удалить задачу?",
      text: `«${existing.title}» будет удалена.`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (ok) {
      await deleteTask(existing.id);
      close();
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={existing ? "Задача" : "Новая задача"}
      footer={
        <>
          {existing && (
            <Button variant="danger" icon={Trash2} onClick={remove} className="mr-auto">
              Удалить
            </Button>
          )}
          <Button onClick={close}>Отмена</Button>
          <Button variant="primary" onClick={save} disabled={!draft.title.trim()}>
            {existing ? "Сохранить" : "Создать"}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Название" className="sm:col-span-2">
          <Input
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Что нужно сделать?"
          />
        </Field>
        <Field label="Срок">
          <Input type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </Field>
        <Field label="Приоритет">
          <Select value={draft.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            {PRIORITY_KEYS.map((p) => (
              <option key={p} value={p}>
                {PRIORITIES[p].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Категория">
          <Input
            list="task-categories"
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Учёба, Личное…"
          />
          <datalist id="task-categories">
            {(categories ?? []).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Предмет / заметка">
          <NodeSelect value={draft.nodeId} onChange={(v) => set("nodeId", v)} />
        </Field>
        <Field label="Описание" className="sm:col-span-2">
          <Textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Подробности, ссылки, шаги…"
          />
        </Field>
        {existing && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.done}
              onChange={(e) => set("done", e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Выполнено
          </label>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
