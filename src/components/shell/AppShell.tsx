"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, PanelLeftOpen, Search } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { cn } from "@/lib/cn";
import { AppProvider, useApp } from "@/components/providers/AppContext";
import { IconButton } from "@/components/ui/primitives";
import { Sidebar } from "./Sidebar";
import { SettingsDialog } from "./SettingsDialog";
import { CommandPalette } from "@/components/search/CommandPalette";
import { MoveDialog } from "@/components/knowledge/MoveDialog";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { EventDialog } from "@/components/planner/EventDialog";

const subscribe = () => () => {};

/**
 * The app reads everything from IndexedDB, which exists only in the browser,
 * so the shell renders on the client only (no hydration mismatches).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-faint">
        {APP_CONFIG.name}
      </div>
    );
  }
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen, setSearchOpen } = useApp();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("nexus-sidebar-collapsed") === "1"
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("nexus-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Close the mobile drawer on navigation.
  useEffect(() => setSidebarOpen(false), [pathname, setSidebarOpen]);

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden shrink-0 overflow-hidden border-r border-line transition-[width] duration-200 lg:block",
          collapsed ? "w-0 border-r-0" : "w-[268px]"
        )}
      >
        <div className="h-full w-[268px]">
          <Sidebar onCollapse={() => setCollapsed(true)} onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="animate-slide absolute inset-y-0 left-0 w-[85%] max-w-[300px] border-r border-line bg-bg shadow-pop">
            <Sidebar
              mobile
              onCollapse={() => setSidebarOpen(false)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 lg:hidden">
          <IconButton icon={MenuIcon} label="Меню" size={18} onClick={() => setSidebarOpen(true)} />
          <span className="text-[15px] font-semibold tracking-tight">{APP_CONFIG.name}</span>
          <IconButton
            icon={Search}
            label="Поиск"
            size={17}
            className="ml-auto"
            onClick={() => setSearchOpen(true)}
          />
        </header>
        {collapsed && (
          <div className="absolute left-2 top-2.5 z-30 hidden lg:block">
            <IconButton icon={PanelLeftOpen} label="Показать панель" onClick={() => setCollapsed(false)} />
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <CommandPalette />
      <MoveDialog />
      <TaskDialog />
      <EventDialog />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
