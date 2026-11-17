"use client";

import { useSyncExternalStore } from "react";

/** Remembers which folders are expanded in the sidebar (localStorage). */
const KEY = "nexus-expanded";
let state: Set<string> = new Set();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    state = new Set();
  }
}

function emit() {
  localStorage.setItem(KEY, JSON.stringify([...state]));
  listeners.forEach((l) => l());
}

export const expandedStore = {
  isOpen(id: string) {
    load();
    return state.has(id);
  },
  set(id: string, open: boolean) {
    load();
    if (open === state.has(id)) return;
    state = new Set(state);
    if (open) state.add(id);
    else state.delete(id);
    emit();
  },
  openMany(ids: string[]) {
    load();
    const next = new Set(state);
    ids.forEach((id) => next.add(id));
    if (next.size === state.size) return;
    state = next;
    emit();
  },
  toggle(id: string) {
    this.set(id, !this.isOpen(id));
  },
};

export function useExpanded() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => state
  );
}
