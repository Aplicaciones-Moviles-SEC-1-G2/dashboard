"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ParkingCircle } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BQ_REGISTRY } from "@/lib/bq-registry";

export function AppSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const items = React.useMemo(
    () => [...BQ_REGISTRY].sort((a, b) => a.displayNumber - b.displayNumber),
    [],
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-2 overflow-hidden"
          aria-label="control-dashboard overview"
        >
          <ParkingCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          {collapsed ? null : <span className="truncate">control-dashboard</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {items.map((bq) => {
            const isActive = pathname === bq.route;
            return (
              <SidebarMenuItem key={bq.id}>
                <SidebarMenuButton isActive={isActive}>
                  <Link
                    href={bq.route}
                    title={collapsed ? `${bq.displayNumber}. ${bq.shortTitle}` : undefined}
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <span
                        className={
                          collapsed
                            ? "flex w-6 shrink-0 justify-center font-mono text-xs text-muted-foreground"
                            : "w-5 shrink-0 text-right font-mono text-xs text-muted-foreground"
                        }
                      >
                        {bq.displayNumber}.
                      </span>
                      {collapsed ? null : (
                        <span className="truncate">{bq.shortTitle}</span>
                      )}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
