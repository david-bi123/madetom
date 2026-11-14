"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  ClipboardList,
  CreditCard,
  FileClock,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/actions";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  children: React.ReactNode;
  user: { name: string; email: string };
  pendingInvitations: number;
  suspendedOrgs: number;
  /** Rendered on the server from the `madetom_admin_sidebar` cookie. */
  defaultSidebarCollapsed?: boolean;
};

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/organisations", label: "Organisations", icon: Building2 },
  { href: "/admin/invitations", label: "Invitations", icon: Mail },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/sms", label: "SMS usage", icon: MessageSquare },
  { href: "/admin/audit", label: "Audit log", icon: FileClock },
  { href: "/admin/settings", label: "Platform settings", icon: Settings },
  { href: "/admin/platform-report", label: "Platform report", icon: ClipboardList },
];

function AdminSidebarContent({
  user,
  pendingInvitations,
  suspendedOrgs,
  collapsed = false,
  onNavigate,
}: {
  user: AdminShellProps["user"];
  pendingInvitations: number;
  suspendedOrgs: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (itemHref: string) =>
    itemHref === "/admin" ? pathname === "/admin" : pathname.startsWith(itemHref);

  return (
    <div className="flex h-full flex-col bg-[#0b1f19]">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
          collapsed ? "justify-center px-0" : "px-5",
        )}
      >
        <Link href="/admin" aria-label="Madetom platform admin" className="rounded-md">
          <Logo inverse showWordmark={!collapsed} />
        </Link>
      </div>

      {collapsed ? null : (
        <div className="mx-4 mb-3 rounded-xl border border-[#29473a] bg-[#10271f] px-3.5 py-2.5">
          <p className="text-[12.5px] font-semibold text-[#eef4ef]">Platform console</p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-[#94ac9f]">
            SamTech Labs · manage every Madetom workspace.
          </p>
        </div>
      )}

      <nav
        className={cn(
          "sidebar-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-4",
          collapsed ? "px-2" : "px-3",
        )}
        aria-label="Platform"
      >
        {ADMIN_NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const badge =
            item.href === "/admin/invitations"
              ? pendingInvitations
              : item.href === "/admin/organisations"
                ? suspendedOrgs
                : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative mb-0.5 flex items-center gap-2.5 rounded-lg text-[12.5px] font-medium transition-colors",
                collapsed ? "h-9 justify-center px-0" : "px-2.5 py-2",
                active
                  ? "bg-[#143027] text-[#f0f5f1]"
                  : "text-[#b3c6ba] hover:bg-[#122b22] hover:text-[#f0f5f1]",
              )}
            >
              {active ? (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#e0bd66]" />
              ) : null}
              <Icon
                className={cn("size-4 shrink-0", active ? "text-[#e0bd66]" : "text-[#7f998b]")}
                strokeWidth={1.8}
              />
              {collapsed ? null : <span className="truncate">{item.label}</span>}
              {badge > 0 && !collapsed ? (
                <span className="ml-auto flex min-w-4.5 items-center justify-center rounded-full bg-[#c8962d] px-1 text-[9.5px] font-bold text-[#1f1705] tabular">
                  {badge}
                </span>
              ) : null}
              {badge > 0 && collapsed ? (
                <span className="absolute top-1.5 right-2 size-1.5 rounded-full bg-[#c8962d]" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[#223f33] p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <Avatar className="size-8 border border-[#345548]" title={user.name}>
              <AvatarFallback className="bg-[#1b3a2d] text-[11px] font-semibold text-[#e8f0ea]">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => void logoutAction()}
              title="Sign out"
              aria-label="Sign out"
              className="flex size-8 items-center justify-center rounded-lg text-[#93aa9d] transition-colors hover:bg-[#143027] hover:text-white"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
              <Avatar className="size-8 border border-[#345548]">
                <AvatarFallback className="bg-[#1b3a2d] text-[11px] font-semibold text-[#e8f0ea]">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-medium text-[#eef4ef]">{user.name}</p>
                <p className="truncate text-[10px] text-[#8ba397]">Super administrator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[#b3c6ba] hover:bg-[#143027] hover:text-white"
              onClick={() => void logoutAction()}
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  user,
  pendingInvitations,
  suspendedOrgs,
  defaultSidebarCollapsed = false,
}: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultSidebarCollapsed);

  const currentLabel =
    ADMIN_NAV.find((item) =>
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
    )?.label ?? "Platform";

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `madetom_admin_sidebar=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background print:h-auto print:overflow-visible">
      {/* Desktop sidebar: fixed to the viewport, collapsible to an icon rail */}
      <aside
        id="admin-sidebar"
        data-collapsed={collapsed}
        className={cn(
          "no-print hidden shrink-0 flex-col bg-[#0b1f19] transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[76px]" : "w-[260px]",
        )}
      >
        <AdminSidebarContent
          user={user}
          pendingInvitations={pendingInvitations}
          suspendedOrgs={suspendedOrgs}
          collapsed={collapsed}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="no-print z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-[#f6f7f3]/92 px-3 backdrop-blur-md sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="admin-sidebar-mobile"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-[var(--shadow-card)] lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              aria-controls="admin-sidebar"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-[var(--shadow-card)] transition-colors hover:text-foreground lg:flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" aria-hidden />
              ) : (
                <PanelLeftClose className="size-4" aria-hidden />
              )}
            </button>
            <span className="truncate font-medium text-foreground">{currentLabel}</span>
            <span className="hidden truncate text-muted-foreground sm:inline">· SamTech Labs</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/app"
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-muted/60"
            >
              Business view
            </Link>
          </div>
        </header>

        {/* The only scrolling region, so the sidebar and header stay put. */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7 print:p-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar panel */}
      <aside
        id="admin-sidebar-mobile"
        aria-label="Platform menu"
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] border-r border-[#223f33] bg-[#0b1f19] transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="absolute top-4 right-3 z-10 flex size-8 items-center justify-center rounded-lg text-[#b3c6ba] hover:bg-[#173429] hover:text-white"
          >
            <X className="size-5" />
          </button>
          <AdminSidebarContent
            user={user}
            pendingInvitations={pendingInvitations}
            suspendedOrgs={suspendedOrgs}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}
    </div>
  );
}
