"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { CalendarEvent, Priority } from "@/lib/db";
import { createEvent, deleteEvent, updateEvent } from "@/lib/events";
import { todayKey } from "@/lib/dates";
import { PRIORITIES, PRIORITY_KEYS } from "@/lib/labels";
import { useApp, type EventEditorState } from "@/components/providers/AppContext";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { NodeSelect } from "@/components/knowledge/NodeSelect";

type Draft = {
  title: string;
  date: string;
  start: string;
  end: string;
  priority: Priority;
  description: string;
  notes: string;
  nodeId?: string;
  done: boolean;
};

const toDraft = (e?: CalendarEvent, d?: Partial<CalendarEvent>): Draft => ({
  title: e?.title ?? d?.title ?? "",
  date: e?.date ?? d?.date ?? todayKey(),
  start: e?.start ?? d?.start ?? "",
  end: e?.end ?? d?.end ?? "",
  priority: e?.priority ?? d?.priority ?? "medium",
  description: e?.description ?? d?.description ?? "",
  notes: e?.notes ?? d?.notes ?? "",
  nodeId: e?.nodeId ?? d?.nodeId,
  done: e?.done ?? false,
});

/** Create / edit planner activity (global, opened via useApp().editEvent). */
export function EventDialog() {
  const { eventEditor } = useApp();
  // Remount the form for every opening so it starts from fresh values.
  return eventEditor ? <Form state={eventEditor} /> : null;
}

function Form({ state }: { state: EventEditorState }) {
  const { editEvent, confirm } = useApp();
  const [draft, setDraft] = useState<Draft>(() => toDraft(state.event, state.defaults));
  const [error, setError] = useState<string | null>(null);


  const existing = state.event;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const close = () => editEvent(null);

  const save = async () => {
    if (!draft.title.trim() || !draft.date) return;
    if (draft.start && draft.end && draft.end <= draft.start) {
      setError("Время окончания должно быть позже начала.");
      return;
    }
    const data = {
      title: draft.title.trim(),
      date: draft.date,
      start: draft.start || undefined,
      end: draft.start ? draft.end || undefined : undefined,
      priority: draft.priority,
      description: draft.description.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      nodeId: draft.nodeId,
      done: draft.done,
    };
    if (existing) await updateEvent(existing.id, data);
    else await createEvent(data);
    close();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: "Удалить из планера?",
      text: `«${existing.title}» будет удалено.`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (ok) {
      await deleteEvent(existing.id);
      close();
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={existing ? "Дело в планере" : "Новое дело"}
      footer={
        <>
          {existing && (
            <Button variant="danger" icon={Trash2} onClick={remove} className="mr-auto">
              Удалить
            </Button>
          )}
          <Button onClick={close}>Отмена</Button>
          <Button variant="primary" onClick={save} disabled={!draft.title.trim() || !draft.date}>
            {existing ? "Сохранить" : "Добавить"}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Название" className="col-span-2">
          <Input
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Урок, встреча, подготовка…"
          />
        </Field>
        <Field label="Дата" className="col-span-2 sm:col-span-1">
          <Input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Приоритет" className="col-span-2 sm:col-span-1">
          <Select value={draft.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            {PRIORITY_KEYS.map((p) => (
              <option key={p} value={p}>
                {PRIORITIES[p].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Начало">
          <Input type="time" value={draft.start} onChange={(e) => set("start", e.target.value)} />
        </Field>
        <Field label="Конец">
          <Input
            type="time"
            value={draft.end}
            disabled={!draft.start}
            onChange={(e) => set("end", e.target.value)}
          />
        </Field>
        {error && <p className="col-span-2 -mt-2 text-[13px] text-danger">{error}</p>}
        <Field label="Предмет / заметка" className="col-span-2">
          <NodeSelect value={draft.nodeId} onChange={(v) => set("nodeId", v)} />
        </Field>
        <Field label="Описание" className="col-span-2">
          <Textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Что именно нужно сделать"
            className="min-h-16"
          />
        </Field>
        <Field label="Дополнительные заметки" className="col-span-2">
          <Textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Материалы, ссылки, напоминания"
            className="min-h-16"
          />
        </Field>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.done}
            onChange={(e) => set("done", e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Выполнено
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
