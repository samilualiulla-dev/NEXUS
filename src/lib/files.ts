import { db, newId } from "./db";

export async function addAttachment(nodeId: string, file: File) {
  await db.attachments.add({
    id: newId(),
    nodeId,
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  });
}

export async function deleteAttachment(id: string) {
  await db.attachments.delete(id);
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Reads an image as a data URL. Large images are downscaled so notes stay
 * light (max side 1600px).
 */
export async function imageToDataUrl(file: File, maxSide = 1600): Promise<string> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  if (file.type === "image/gif" || file.type === "image/svg+xml") return raw;
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = raw;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 600 * 1024) return raw;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(type, 0.85);
}
