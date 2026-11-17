import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import { APP_CONFIG } from "@/config/app";

export const DATE_FMT = "yyyy-MM-dd";

export const toKey = (d: Date) => format(d, DATE_FMT);
export const fromKey = (k: string) => parseISO(k);
export const todayKey = () => toKey(new Date());

export const fmt = (d: Date | string, pattern: string) =>
  format(typeof d === "string" ? fromKey(d) : d, pattern, { locale: ru });

const wk = { weekStartsOn: APP_CONFIG.weekStartsOn };

export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d, wk);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 6-week grid for a month view, starting on Monday. */
export function monthGrid(d: Date): Date[] {
  const start = startOfWeek(startOfMonth(d), wk);
  const end = endOfWeek(endOfMonth(d), wk);
  const days: Date[] = [];
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) days.push(cur);
  while (days.length < 42) days.push(addDays(days[days.length - 1], 1));
  return days;
}

export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function timeToMinutes(t?: string) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Human label for a due date relative to today. */
export function relativeDay(key: string) {
  const today = todayKey();
  if (key === today) return "Сегодня";
  if (key === toKey(addDays(new Date(), 1))) return "Завтра";
  if (key === toKey(addDays(new Date(), -1))) return "Вчера";
  return fmt(key, "d MMM");
}
