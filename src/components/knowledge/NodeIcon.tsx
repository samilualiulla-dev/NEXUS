import { FileText, Folder, FolderOpen } from "lucide-react";
import type { TreeNode } from "@/lib/db";
import { cn } from "@/lib/cn";

export function NodeIcon({
  node,
  open,
  size = 16,
  className,
}: {
  node: Pick<TreeNode, "type" | "icon">;
  open?: boolean;
  size?: number;
  className?: string;
}) {
  if (node.icon)
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
        style={{ width: size, height: size, fontSize: size * 0.9 }}
      >
        {node.icon}
      </span>
    );
  const Icon = node.type === "note" ? FileText : open ? FolderOpen : Folder;
  return <Icon size={size} strokeWidth={1.8} className={cn("shrink-0 text-muted", className)} />;
}
