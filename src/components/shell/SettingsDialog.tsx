"use client";

import { useRef, useState } from "react";
import { Download, Moon, Sun, Upload } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { exportAll, importAll } from "@/lib/backup";
import { downloadBlob } from "@/lib/files";
import { todayKey } from "@/lib/dates";
import { useApp } from "@/components/providers/AppContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, toggleTheme, confirm } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const doExport = async () => {
    setStatus("Подготовка файла…");
    const blob = await exportAll();
    downloadBlob(blob, `${APP_CONFIG.name.toLowerCase()}-backup-${todayKey()}.json`);
    setStatus("Резервная копия сохранена.");
  };

  const doImport = async (file: File) => {
    const ok = await confirm({
      title: "Восстановить из копии?",
      text: "Все текущие данные будут заменены данными из файла.",
      confirmLabel: "Восстановить",
      danger: true,
    });
    if (!ok) return;
    try {
      setStatus("Импорт…");
      await importAll(file);
      setStatus("Данные восстановлены.");
    } catch (e) {
      setStatus("Ошибка: " + (e as Error).message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Настройки" size="md">
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="mb-2 text-sm font-medium">Тема</h3>
          <Button icon={theme === "dark" ? Sun : Moon} onClick={toggleTheme}>
            {theme === "dark" ? "Включить светлую" : "Включить тёмную"}
          </Button>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-medium">Резервная копия</h3>
          <p className="mb-3 text-[13px] text-muted">
            Все данные хранятся в этом браузере (IndexedDB). Сохраняйте копию, чтобы перенести
            данные на другое устройство или не потерять их при очистке браузера.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button icon={Download} onClick={doExport}>
              Скачать копию (.json)
            </Button>
            <Button icon={Upload} onClick={() => fileRef.current?.click()}>
              Восстановить из файла
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) doImport(f);
              }}
            />
          </div>
          {status && <p className="mt-3 text-[13px] text-muted">{status}</p>}
        </section>
      </div>
    </Modal>
  );
}
