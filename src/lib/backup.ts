import { db } from "./db";
import { APP_CONFIG } from "@/config/app";

/**
 * Export / import of the whole database as one JSON file.
 * Useful for backups and for moving data to another browser or a future
 * server database.
 */

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });

export async function exportAll(): Promise<Blob> {
  const attachments = await Promise.all(
    (await db.attachments.toArray()).map(async (a) => ({
      ...a,
      blob: await blobToDataUrl(a.blob),
    }))
  );
  const data = {
    app: APP_CONFIG.name,
    version: 1,
    exportedAt: new Date().toISOString(),
    nodes: await db.nodes.toArray(),
    docs: await db.docs.toArray(),
    texts: await db.texts.toArray(),
    tasks: await db.tasks.toArray(),
    events: await db.events.toArray(),
    attachments,
  };
  return new Blob([JSON.stringify(data)], { type: "application/json" });
}

export async function importAll(file: File) {
  const data = JSON.parse(await file.text());
  if (!Array.isArray(data.nodes)) throw new Error("Неверный формат файла");
  const attachments = await Promise.all(
    (data.attachments ?? []).map(
      async (a: { blob: string } & Record<string, unknown>) => ({
        ...a,
        blob: await (await fetch(a.blob)).blob(),
      })
    )
  );
  await db.transaction(
    "rw",
    [db.nodes, db.docs, db.texts, db.tasks, db.events, db.attachments],
    async () => {
      await Promise.all([
        db.nodes.clear(),
        db.docs.clear(),
        db.texts.clear(),
        db.tasks.clear(),
        db.events.clear(),
        db.attachments.clear(),
      ]);
      await db.nodes.bulkAdd(data.nodes);
      await db.docs.bulkAdd(data.docs ?? []);
      await db.texts.bulkAdd(data.texts ?? []);
      await db.tasks.bulkAdd(data.tasks ?? []);
      await db.events.bulkAdd(data.events ?? []);
      await db.attachments.bulkAdd(attachments);
    }
  );
}
