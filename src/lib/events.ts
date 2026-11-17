import { db, newId, type CalendarEvent } from "./db";
import { timeToMinutes } from "./dates";

export type EventInput = Omit<CalendarEvent, "id" | "createdAt" | "done"> & {
  done?: boolean;
};

export async function createEvent(input: EventInput) {
  const ev: CalendarEvent = {
    ...input,
    id: newId(),
    done: input.done ?? false,
    createdAt: Date.now(),
  };
  await db.events.add(ev);
  return ev;
}

export async function updateEvent(id: string, patch: Partial<CalendarEvent>) {
  await db.events.update(id, patch);
}

export async function deleteEvent(id: string) {
  await db.events.delete(id);
}

export function sortEvents(a: CalendarEvent, b: CalendarEvent) {
  const am = timeToMinutes(a.start) ?? -1;
  const bm = timeToMinutes(b.start) ?? -1;
  if (am !== bm) return am - bm;
  return a.createdAt - b.createdAt;
}

export function timeRange(e: Pick<CalendarEvent, "start" | "end">) {
  if (!e.start) return "";
  return e.end ? `${e.start}–${e.end}` : e.start;
}
