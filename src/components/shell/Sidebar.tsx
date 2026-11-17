"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  FilePlus,
  FolderPlus,
  LayoutDashboard,
  Moon,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppContext";
import { IconButton, Kbd } from "@/components/ui/primitives";
import { useMenu } from "@/components/ui/Menu";
import { Tree } from "@/components/knowledge/Tree";
import { useNodeActions } from "@/components/knowledge/useNodeActions";

const NAV = [
  { href: "/", label: "Главная", icon: LayoutDashboard },
  { href: "/planner", label: "Планер", icon: CalendarDays },
  { href: "/tasks", label: "Задачи", icon: CheckSquare },
];

export function Sidebar({
  onCollapse,
  onOpenSettings,
  mobile,
}: {
  onCollapse: () => void;
  onOpenSettings: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const { setSearchOpen, theme, toggleTheme, setSidebarOpen } = useApp();
  const actions = useNodeActions();
  const menu = useMenu();

  return (
    <aside className="flex h-full w-full flex-col bg-surface-2/60">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <Link
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-fg text-[11px] font-bold text-bg">
            {APP_CONFIG.name.charAt(0)}
          </span>
          <span className="text-[15px]">{APP_CONFIG.name}</span>
        </Link>
        <IconButton
          icon={mobile ? X : PanelLeftClose}
          label={mobile ? "Закрыть меню" : "Скрыть панель"}
          onClick={onCollapse}
        />
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button
          onClick={() => {
            setSidebarOpen(false);
            setSearchOpen(true);
          }}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px] text-faint transition-colors hover:border-line-strong hover:text-muted"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Поиск</span>
          <span className="hidden sm:inline">
            <Kbd>Ctrl K</Kbd>
          </span>
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-1.5 pb-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors",
                active ? "bg-hover font-medium text-fg" : "text-fg/80 hover:bg-hover/70"
              )}
            >
              <Icon size={16} strokeWidth={1.8} className={active ? "text-fg" : "text-muted"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Knowledge tree */}
      <div className="flex items-center justify-between px-4 pb-1 pt-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Знания</span>
        <IconButton
          icon={Plus}
          label="Создать в корне"
          size={15}
          onClick={(e) =>
            menu.open(e.currentTarget.getBoundingClientRect(), [
              { label: "Папку", icon: FolderPlus, onSelect: () => actions.createFolder(null) },
              { label: "Заметку", icon: FilePlus, onSelect: () => actions.createNote(null) },
            ])
          }
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <Tree />
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center gap-1 border-t border-line px-3 py-2">
        <IconButton
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          onClick={toggleTheme}
        />
        <IconButton icon={Settings} label="Настройки и резервная копия" onClick={onOpenSettings} />
        <span className="ml-auto truncate text-[11px] text-faint">Данные хранятся локально</span>
      </div>
      {menu.element}
    </aside>
  );
}
