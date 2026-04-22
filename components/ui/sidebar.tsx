"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "control-dashboard:sidebar-collapsed";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
  toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}): React.JSX.Element {
  const [collapsed, setCollapsedState] = React.useState(defaultCollapsed);

  // Rehydrate preference after mount so SSR output stays deterministic.
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsedState(true);
      else if (stored === "0") setCollapsedState(false);
    } catch {
      /* localStorage unavailable; fall back to default */
    }
  }, []);

  const setCollapsed = React.useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsedState((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ collapsed, setCollapsed, toggle }),
    [collapsed, setCollapsed, toggle],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used inside <SidebarProvider>");
  }
  return ctx;
}

export function Sidebar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>): React.JSX.Element {
  const { collapsed } = useSidebar();
  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-14" : "w-64",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn("flex h-14 items-center gap-2 px-3 font-semibold", className)}
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={cn("flex-1 overflow-y-auto px-2 py-4", className)} {...props} />
  );
}

export function SidebarGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("mb-4", className)} {...props} />;
}

export function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  const { collapsed } = useSidebar();
  if (collapsed) return <div aria-hidden className="h-2" />;
  return (
    <div
      className={cn(
        "px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>): React.JSX.Element {
  return <ul className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

export function SidebarMenuItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>): React.JSX.Element {
  return <li className={cn("list-none", className)} {...props} />;
}

interface SidebarMenuButtonProps {
  isActive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function SidebarMenuButton({
  className,
  isActive,
  children,
}: SidebarMenuButtonProps): React.JSX.Element {
  return (
    <div
      data-active={isActive ? "true" : undefined}
      className={cn(
        "group/sidebar-item flex w-full items-center justify-between gap-2 rounded-md text-sm transition-colors",
        "[&>a]:flex [&>a]:w-full [&>a]:items-center [&>a]:justify-between [&>a]:gap-2 [&>a]:px-2 [&>a]:py-2",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "mt-auto flex items-center gap-2 border-t border-sidebar-border px-3 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarTrigger({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const { collapsed, toggle } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </Button>
  );
}
