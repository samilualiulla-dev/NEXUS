"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type CalendarEvent, type Task, type TreeNode } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button, Input } from "@/components/ui/primitives";

type Theme = "light" | "dark";

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel?: string;
  danger?: boolean;
}
interface PromptOptions {
  title: string;
  label?: string;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
}

export interface TaskEditorState {
  task?: Task;
  defaults?: Partial<Task>;
}
export interface EventEditorState {
  event?: CalendarEvent;
  defaults?: Partial<CalendarEvent>;
}

interface AppContextValue {
  nodes: TreeNode[];
  nodesLoaded: boolean;
  theme: Theme;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  taskEditor: TaskEditorState | null;
  editTask: (state: TaskEditorState | null) => void;
  eventEditor: EventEditorState | null;
  editEvent: (state: EventEditorState | null) => void;
  moveTarget: string | null;
  setMoveTarget: (id: string | null) => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  prompt: (o: PromptOptions) => Promise<string | null>;
}

const Ctx = createContext<AppContextValue | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const nodesQuery = useLiveQuery(() => db.nodes.toArray(), []);
  const nodes = useMemo(() => nodesQuery ?? [], [nodesQuery]);

  /* Theme */
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next === "dark");
    localStorage.setItem("nexus-theme", next);
    setTheme(next);
    setTimeout(() => root.classList.remove("theme-transition"), 250);
  }, [theme]);

  /* UI state */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [taskEditor, editTask] = useState<TaskEditorState | null>(null);
  const [eventEditor, editEvent] = useState<EventEditorState | null>(null);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Confirm / prompt dialogs */
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [promptState, setPromptState] = useState<PromptOptions | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const resolver = useRef<((v: unknown) => void) | null>(null);

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((res) => {
        resolver.current = res as (v: unknown) => void;
        setConfirmState(o);
      }),
    []
  );
  const prompt = useCallback(
    (o: PromptOptions) =>
      new Promise<string | null>((res) => {
        resolver.current = res as (v: unknown) => void;
        setPromptValue(o.initial ?? "");
        setPromptState(o);
      }),
    []
  );
  const finish = (v: unknown) => {
    resolver.current?.(v);
    resolver.current = null;
    setConfirmState(null);
    setPromptState(null);
  };

  const value: AppContextValue = {
    nodes,
    nodesLoaded: nodesQuery !== undefined,
    theme,
    toggleTheme,
    sidebarOpen,
    setSidebarOpen,
    searchOpen,
    setSearchOpen,
    taskEditor,
    editTask,
    eventEditor,
    editEvent,
    moveTarget,
    setMoveTarget,
    confirm,
    prompt,
  };

  return (
    <Ctx.Provider value={value}>
      {children}

      <Modal
        open={!!confirmState}
        onClose={() => finish(false)}
        title={confirmState?.title}
        size="sm"
        footer={
          <>
            <Button onClick={() => finish(false)}>Отмена</Button>
            <Button
              data-autofocus
              variant={confirmState?.danger ? "danger" : "primary"}
              onClick={() => finish(true)}
            >
              {confirmState?.confirmLabel ?? "Подтвердить"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{confirmState?.text}</p>
      </Modal>

      <Modal
        open={!!promptState}
        onClose={() => finish(null)}
        title={promptState?.title}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (promptValue.trim()) finish(promptValue.trim());
          }}
          className="flex flex-col gap-4"
        >
          <Input
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            placeholder={promptState?.placeholder}
            aria-label={promptState?.label ?? promptState?.title}
            onFocus={(e) => e.target.select()}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => finish(null)}>Отмена</Button>
            <Button type="submit" variant="primary" disabled={!promptValue.trim()}>
              {promptState?.confirmLabel ?? "Сохранить"}
            </Button>
          </div>
        </form>
      </Modal>
    </Ctx.Provider>
  );
}
