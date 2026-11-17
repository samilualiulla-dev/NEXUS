"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { ancestorsOf } from "@/lib/tree";
import { useApp } from "@/components/providers/AppContext";
import { nodeHref } from "./useNodeActions";

export function Breadcrumbs({ nodeId }: { nodeId: string }) {
  const { nodes } = useApp();
  const path = ancestorsOf(nodes, nodeId);
  return (
    <nav aria-label="Путь" className="flex min-w-0 flex-wrap items-center gap-1 text-[13px] text-muted">
      <Link href="/" className="flex items-center rounded px-1 py-0.5 hover:bg-hover hover:text-fg" aria-label="Главная">
        <Home size={14} />
      </Link>
      {path.map((n, i) => (
        <span key={n.id} className="flex min-w-0 items-center gap-1">
          <ChevronRight size={13} className="shrink-0 text-faint" />
          {i === path.length - 1 ? (
            <span className="truncate px-1 text-fg">{n.title}</span>
          ) : (
            <Link href={nodeHref(n.id)} className="max-w-48 truncate rounded px-1 py-0.5 hover:bg-hover hover:text-fg">
              {n.title}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
