"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { useApp } from "@/components/providers/AppContext";
import { FolderView } from "@/components/knowledge/FolderView";
import { NoteView } from "@/components/knowledge/NoteView";
import { EmptyState } from "@/components/ui/primitives";

/** Every folder and note has its own page: /n/<id> */
export default function NodePage() {
  const { id } = useParams<{ id: string }>();
  const { nodes, nodesLoaded } = useApp();
  const node = nodes.find((n) => n.id === id);

  if (!nodesLoaded) return null;
  if (!node) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <EmptyState
          icon={FileQuestion}
          title="Страница не найдена"
          text="Возможно, она была удалена."
          action={
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-sm font-medium hover:bg-hover"
            >
              На главную
            </Link>
          }
        />
      </div>
    );
  }
  return node.type === "folder" ? <FolderView key={node.id} node={node} /> : <NoteView key={node.id} node={node} />;
}
