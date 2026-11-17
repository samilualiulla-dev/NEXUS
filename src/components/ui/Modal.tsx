"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./primitives";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    // Focus first field
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], input:not([type=checkbox]), textarea, select"
      );
      el?.focus();
    }, 20);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:pt-[10vh]">
      <div className="animate-fade absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-pop relative flex max-h-[90dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-pop",
          "rounded-t-2xl sm:rounded-xl",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <IconButton icon={X} label="Закрыть" onClick={onClose} />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
