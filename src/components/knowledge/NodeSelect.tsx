"use client";

import { useMemo } from "react";
import { childrenOf } from "@/lib/tree";
import { useApp } from "@/components/providers/AppContext";
import { Select } from "@/components/ui/primitives";

/** Dropdown to link something to a folder (subject) or note. */
export function NodeSelect({
  value,
  onChange,
}: {
  value?: string;
  onChange: (id: string | undefined) => void;
}) {
  const { nodes } = useApp();
  const options = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const n of childrenOf(nodes, parent)) {
        out.push({
          id: n.id,
          label: `${"   ".repeat(depth)}${n.type === "folder" ? "▸ " : "· "}${n.title}`,
        });
        if (n.type === "folder") walk(n.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [nodes]);

  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">— не привязано —</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
