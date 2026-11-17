import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { Mathematics } from "@tiptap/extension-mathematics";
import type { Node as PMNode } from "@tiptap/pm/model";

export interface MathHandlers {
  onInlineClick: (node: PMNode, pos: number) => void;
  onBlockClick: (node: PMNode, pos: number) => void;
}

/** All editor extensions in one place — add new ones here. */
export function buildExtensions(math: MathHandlers) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      },
    }),
    TableKit.configure({ table: { resizable: true } }),
    Image.configure({ allowBase64: true, inline: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === "heading"
          ? "Заголовок"
          : "Начните писать… «#» — заголовок, «-» — список, «[ ]» — чекбокс, «```» — код",
    }),
    Mathematics.configure({
      katexOptions: { throwOnError: false },
      inlineOptions: { onClick: math.onInlineClick },
      blockOptions: { onClick: math.onBlockClick },
    }),
  ];
}
