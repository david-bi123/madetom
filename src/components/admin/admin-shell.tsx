"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  FileClock,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Settings,
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
};

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/organisations", label: "Organisations", icon: Building2 },
  { href: "/admin/invitations", label: "Invitations", icon: Mail },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/sms", label: "SMS usage", icon: MessageSquare },
  { href: "/admin/audit", label: "Audit log", icon: FileClock },
  { href: "/admin/settings", label: "Platform settings", icon: Settings },
];

export function AdminShell({ children, user, pendingInvitations, suspendedOrgs }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-svh bg-background">
      <div className="flex min-h-svh">
        <aside className="hidden w-[248px] shrink-0 flex-col bg-[#0b1f19] lg:flex">
          <div className="flex h-16 items-center px-5">
            <Link href="/admin" aria-label="Madetom platform admin" className="rounded-md">
              <Logo inverse />
            </Link>
          </div>
          <div className="mx-4 mb-4 rounded-xl border border-[#29473a] bg-[#10271f] px-3.5 py-3">
            <p className="text-[12.5px] font-semibold text-[#eef4ef]">Platform console</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#94ac9f]">
              SamTech Labs · manage every Madetom workspace.
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Platform">
            {ADMIN_NAV.map((item) => {
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
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
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                    active
                      ? "bg-[#143027] text-[#f0f5f1]"
                      : "text-[#b3c6ba] hover:bg-[#122b22] hover:text-[#f0f5f1]",
                  )}
                >
                  {active ? <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#e0bd66]" /> : null}
                  <Icon className={cn("size-4 shrink-0", active ? "text-[#e0bd66]" : "text-[#7f998b]")} strokeWidth={1.8} />
                  <span className="truncate">{item.label}</span>
                  {badge > 0 ? (
                    <span className="ml-auto flex min-w-4.5 items-center justify-center rounded-full bg-[#c8962d] px-1 text-[9.5px] font-bold text-[#1f1705] tabular">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="shrink-0 border-t border-[#223f33] p-3">
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
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-[#f6f7f3]/92 px-4 backdrop-blur-md sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground">
                {ADMIN_NAV.find((item) =>
                  item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
                )?.label ?? "Platform"}
              </span>
              <span className="hidden sm:inline">· SamTech Labs</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/app"
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-muted/60"
              >
                Business view
              </Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
