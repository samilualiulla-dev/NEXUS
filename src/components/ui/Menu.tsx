"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type MenuItem =
  | {
      label: string;
      icon?: LucideIcon;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
    }
  | "separator";

/**
 * Lightweight dropdown menu rendered in a portal (never clipped by
 * scroll containers). Positioned next to the anchor element or a point.
 */
export function Menu({
  anchor,
  items,
  onClose,
}: {
  anchor: DOMRect | { x: number; y: number };
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left: number, top: number;
    if ("width" in anchor) {
      left = anchor.right - w;
      top = anchor.bottom + 4;
      if (left < 8) left = anchor.left;
      if (top + h > window.innerHeight - 8) top = anchor.top - h - 4;
    } else {
      left = anchor.x;
      top = anchor.y;
      if (left + w > window.innerWidth - 8) left = anchor.x - w;
      if (top + h > window.innerHeight - 8) top = anchor.y - h;
    }
    setPos({
      left: Math.max(8, Math.min(left, window.innerWidth - w - 8)),
      top: Math.max(8, top),
    });
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const t = setTimeout(() => {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("touchstart", onDown);
    });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
      className="animate-pop fixed z-[60] min-w-48 rounded-lg border border-line bg-surface p-1 shadow-pop"
    >
      {items.map((item, i) =>
        item === "separator" ? (
          <div key={i} className="my-1 h-px bg-line" />
        ) : (
          <button
            key={i}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
              "hover:bg-hover disabled:pointer-events-none disabled:opacity-40",
              item.danger ? "text-danger" : "text-fg"
            )}
          >
            {item.icon && <item.icon size={15} className={item.danger ? "" : "text-muted"} />}
            {item.label}
          </button>
        )
      )}
    </div>,
    document.body
  );
}

/** Hook: manages one open menu at a time. */
export function useMenu() {
  const [state, setState] = useState<{
    anchor: DOMRect | { x: number; y: number };
    items: MenuItem[];
  } | null>(null);
  const open = useCallback(
    (anchor: DOMRect | { x: number; y: number }, items: MenuItem[]) =>
      setState({ anchor, items }),
    []
  );
  const close = useCallback(() => setState(null), []);
  const element = state ? (
    <Menu anchor={state.anchor} items={state.items} onClose={close} />
  ) : null;
  return { open, close, element };
}
