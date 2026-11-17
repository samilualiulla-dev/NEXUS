"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Download, File as FileIcon, FileImage, Paperclip, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { addAttachment, deleteAttachment, downloadBlob, formatSize } from "@/lib/files";
import { useApp } from "@/components/providers/AppContext";
import { Button, IconButton, SectionTitle } from "@/components/ui/primitives";

/** Files attached to a folder or note (stored as blobs in IndexedDB). */
export function Attachments({
  nodeId,
  inputRef,
}: {
  nodeId: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { confirm } = useApp();
  const files = useLiveQuery(
    () => db.attachments.where("nodeId").equals(nodeId).sortBy("createdAt"),
    [nodeId]
  );

  const open = async (id: string) => {
    const f = await db.attachments.get(id);
    if (!f) return;
    if (f.mime.startsWith("image/") || f.mime === "application/pdf" || f.mime.startsWith("text/")) {
      const url = URL.createObjectURL(f.blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else downloadBlob(f.blob, f.name);
  };

  return (
    <section className="mt-10">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={async (e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = "";
          for (const f of list) await addAttachment(nodeId, f);
        }}
      />
      {files && files.length > 0 && (
        <>
          <SectionTitle
            action={
              <Button size="sm" variant="ghost" icon={Paperclip} onClick={() => inputRef.current?.click()}>
                Добавить
              </Button>
            }
          >
            Файлы · {files.length}
          </SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
                {f.mime.startsWith("image/") ? (
                  <FileImage size={18} className="shrink-0 text-muted" />
                ) : (
                  <FileIcon size={18} className="shrink-0 text-muted" />
                )}
                <button onClick={() => open(f.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm hover:underline">{f.name}</span>
                  <span className="block text-[12px] text-faint">{formatSize(f.size)}</span>
                </button>
                <IconButton icon={Download} label="Скачать" onClick={() => downloadBlob(f.blob, f.name)} />
                <IconButton
                  icon={Trash2}
                  label="Удалить файл"
                  onClick={async () => {
                    if (await confirm({ title: "Удалить файл?", text: f.name, confirmLabel: "Удалить", danger: true }))
                      deleteAttachment(f.id);
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
