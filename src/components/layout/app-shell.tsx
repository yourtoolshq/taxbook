"use client";

import { AppSidebar } from "./app-sidebar";
import { SiteHeader } from "./site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
