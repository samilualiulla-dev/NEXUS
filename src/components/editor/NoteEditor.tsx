"use client";

// TipTap is an imperative editor: its callbacks are created once and read the
// latest values through refs. That is intentional here.
/* eslint-disable react-hooks/refs */

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { loadNoteDoc, saveNoteContent } from "@/lib/tree";
import { imageToDataUrl } from "@/lib/files";
import { useApp } from "@/components/providers/AppContext";
import { buildExtensions } from "./extensions";
import { Toolbar } from "./Toolbar";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 600;

/** Loads the note document, then mounts the editor with it. */
export function NoteEditor({
  nodeId,
  onStatus,
  onAttach,
}: {
  nodeId: string;
  onStatus: (s: SaveStatus) => void;
  onAttach: () => void;
}) {
  const [initial, setInitial] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadNoteDoc(nodeId).then((json) => alive && setInitial(json ?? null));
    return () => {
      alive = false;
    };
  }, [nodeId]);

  if (initial === undefined) {
    return (
      <div className="space-y-3 pt-6">
        {[90, 75, 82, 40].map((w) => (
          <div key={w} className="h-4 animate-pulse rounded bg-hover" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }
  return <EditorInner key={nodeId} nodeId={nodeId} initial={initial} onStatus={onStatus} onAttach={onAttach} />;
}

function EditorInner({
  nodeId,
  initial,
  onStatus,
  onAttach,
}: {
  nodeId: string;
  initial: string | null;
  onStatus: (s: SaveStatus) => void;
  onAttach: () => void;
}) {
  const { prompt } = useApp();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  // Latest snapshot of the document, captured on every change so it can be
  // saved even after the editor instance is destroyed (page leave).
  const pending = useRef<{ json: unknown; text: string } | null>(null);

  const save = async () => {
    timer.current = null;
    const snap = pending.current;
    if (!snap) return;
    pending.current = null;
    try {
      await saveNoteContent(nodeId, JSON.stringify(snap.json), snap.text);
      statusRef.current("saved");
    } catch {
      statusRef.current("error");
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  const extensions = useMemo(
    () =>
      buildExtensions({
        onInlineClick: async (node: PMNode, pos: number) => {
          const latex = await prompt({ title: "Формула", initial: node.attrs.latex, label: "LaTeX" });
          const ed = editorRef.current;
          if (latex !== null && ed)
            ed.chain().setNodeSelection(pos).updateInlineMath({ latex }).focus().run();
        },
        onBlockClick: async (node: PMNode, pos: number) => {
          const latex = await prompt({ title: "Формула (блок)", initial: node.attrs.latex, label: "LaTeX" });
          const ed = editorRef.current;
          if (latex !== null && ed)
            ed.chain().setNodeSelection(pos).updateBlockMath({ latex }).focus().run();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const content = useMemo(() => {
    if (!initial) return "";
    try {
      return JSON.parse(initial);
    } catch {
      return "";
    }
  }, [initial]);

  const insertImages = async (files: File[]) => {
    const ed = editorRef.current;
    if (!ed) return;
    for (const f of files) {
      const src = await imageToDataUrl(f);
      ed.chain().focus().setImage({ src, alt: f.name }).run();
    }
  };

  const editor = useEditor({
    extensions,
    content,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: "prose-nexus", spellcheck: "true" },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        insertImages(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        insertImages(files);
        return true;
      },
      handleClick: (_view, _pos, event) => {
        // Ctrl/Cmd + click opens links.
        const a = (event.target as HTMLElement).closest("a");
        if (a && (event.ctrlKey || event.metaKey)) {
          window.open(a.href, "_blank", "noopener");
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      pending.current = { json: ed.getJSON(), text: ed.getText({ blockSeparator: "\n" }) };
      statusRef.current("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => saveRef.current(), AUTOSAVE_MS);
    },
  });
  editorRef.current = editor;

  // Flush pending changes when leaving the page or closing the tab.
  useEffect(() => {
    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        saveRef.current();
      }
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  return (
    <div>
      <Toolbar editor={editor} onImages={insertImages} onAttach={onAttach} />
      <div className="pt-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
