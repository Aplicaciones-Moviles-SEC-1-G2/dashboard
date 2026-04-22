import * as React from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CommandPalette } from "@/components/layout/command-palette";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full items-start">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-2">
              <CommandPalette />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
