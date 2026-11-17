"use client";

import { useRef } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  CodeSquare,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Paperclip,
  Quote,
  Redo2,
  Sigma,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { useMenu, type MenuItem } from "@/components/ui/Menu";

function Btn({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-35",
        active ? "bg-hover text-fg" : "text-muted hover:bg-hover hover:text-fg"
      )}
    >
      <Icon size={16} strokeWidth={2} />
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-line" />;

export function Toolbar({
  editor,
  onImages,
  onAttach,
}: {
  editor: Editor;
  onImages: (files: File[]) => void;
  onAttach: () => void;
}) {
  const { prompt } = useApp();
  const menu = useMenu();
  const imgRef = useRef<HTMLInputElement>(null);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const c = () => editor.chain().focus();

  const setLink = async () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = await prompt({
      title: prev ? "Изменить ссылку" : "Вставить ссылку",
      initial: prev ?? "https://",
      label: "Адрес",
      placeholder: "https://… (введите «-», чтобы убрать)",
    });
    if (url === null) return;
    if (url === "-") {
      c().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^[a-z]+:/i.test(url) ? url : `https://${url}`;
    if (editor.state.selection.empty && !prev) {
      c().insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      c().extendMarkRange("link").setLink({ href }).run();
    }
  };

  const insertMath = async (block: boolean) => {
    const latex = await prompt({
      title: block ? "Формула (отдельной строкой)" : "Формула в строке",
      label: "LaTeX",
      placeholder: block ? "\\int_0^1 x^2\\,dx = \\frac{1}{3}" : "E = mc^2",
      confirmLabel: "Вставить",
    });
    if (!latex) return;
    if (block) c().insertBlockMath({ latex }).run();
    else c().insertInlineMath({ latex }).run();
  };

  const tableItems = (): MenuItem[] =>
    s?.table
      ? [
          { label: "Строка ниже", onSelect: () => c().addRowAfter().run() },
          { label: "Строка выше", onSelect: () => c().addRowBefore().run() },
          { label: "Столбец справа", onSelect: () => c().addColumnAfter().run() },
          { label: "Столбец слева", onSelect: () => c().addColumnBefore().run() },
          "separator",
          { label: "Строка-заголовок вкл/выкл", onSelect: () => c().toggleHeaderRow().run() },
          { label: "Объединить / разделить ячейки", onSelect: () => c().mergeOrSplit().run() },
          "separator",
          { label: "Удалить строку", danger: true, onSelect: () => c().deleteRow().run() },
          { label: "Удалить столбец", danger: true, onSelect: () => c().deleteColumn().run() },
          { label: "Удалить таблицу", danger: true, onSelect: () => c().deleteTable().run() },
        ]
      : [
          { label: "Таблица 3 × 3", onSelect: () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
          { label: "Таблица 4 × 4", onSelect: () => c().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run() },
          { label: "Таблица 2 × 5", onSelect: () => c().insertTable({ rows: 5, cols: 2, withHeaderRow: true }).run() },
        ];

  if (!s) return null;

  return (
    <div className="sticky top-0 z-20 -mx-2 border-b border-line bg-bg/90 px-2 py-1.5 backdrop-blur">
      <div className="flex items-center gap-0.5 overflow-x-auto sm:flex-wrap sm:overflow-visible">
        <Btn icon={Undo2} label="Отменить (Ctrl+Z)" disabled={!s.canUndo} onClick={() => c().undo().run()} />
        <Btn icon={Redo2} label="Повторить (Ctrl+Shift+Z)" disabled={!s.canRedo} onClick={() => c().redo().run()} />
        <Sep />
        <Btn icon={Heading1} label="Заголовок 1" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()} />
        <Btn icon={Heading2} label="Заголовок 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()} />
        <Btn icon={Heading3} label="Заголовок 3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()} />
        <Sep />
        <Btn icon={Bold} label="Жирный (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()} />
        <Btn icon={Italic} label="Курсив (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()} />
        <Btn icon={Underline} label="Подчёркнутый (Ctrl+U)" active={s.underline} onClick={() => c().toggleUnderline().run()} />
        <Btn icon={Strikethrough} label="Зачёркнутый" active={s.strike} onClick={() => c().toggleStrike().run()} />
        <Btn icon={Code} label="Код в строке" active={s.code} onClick={() => c().toggleCode().run()} />
        <Btn icon={Link2} label="Ссылка" active={s.link} onClick={setLink} />
        <Sep />
        <Btn icon={List} label="Маркированный список" active={s.bullet} onClick={() => c().toggleBulletList().run()} />
        <Btn icon={ListOrdered} label="Нумерованный список" active={s.ordered} onClick={() => c().toggleOrderedList().run()} />
        <Btn icon={ListChecks} label="Чек-лист" active={s.task} onClick={() => c().toggleTaskList().run()} />
        <Btn icon={Quote} label="Цитата" active={s.quote} onClick={() => c().toggleBlockquote().run()} />
        <Btn icon={CodeSquare} label="Блок кода" active={s.codeBlock} onClick={() => c().toggleCodeBlock().run()} />
        <Btn icon={Minus} label="Разделитель" onClick={() => c().setHorizontalRule().run()} />
        <Sep />
        <Btn
          icon={TableIcon}
          label="Таблица"
          active={s.table}
          onClick={(e) => menu.open(e.currentTarget.getBoundingClientRect(), tableItems())}
        />
        <Btn
          icon={Sigma}
          label="Формула"
          onClick={(e) =>
            menu.open(e.currentTarget.getBoundingClientRect(), [
              { label: "Формула в строке", onSelect: () => insertMath(false) },
              { label: "Формула отдельной строкой", onSelect: () => insertMath(true) },
            ])
          }
        />
        <Btn icon={ImagePlus} label="Изображение" onClick={() => imgRef.current?.click()} />
        <Btn icon={Paperclip} label="Прикрепить файл" onClick={onAttach} />
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) onImages(files);
          }}
        />
      </div>
      {menu.element}
    </div>
  );
}
