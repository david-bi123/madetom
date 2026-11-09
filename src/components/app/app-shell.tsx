"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BellRing,
  Boxes,
  Check,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  ReceiptText,
  ScanBarcode,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MaintenanceBanner } from "@/components/app/maintenance-banner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { logoutAction } from "@/app/(auth)/actions";
import { switchBranchAction } from "@/lib/auth/branch-actions";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PermissionKey } from "@/lib/permissions";

type ShellBranch = { id: string; name: string; code: string; isDefault: boolean };

export type AppShellProps = {
  children: React.ReactNode;
  user: { name: string; email: string };
  tenant: { name: string; slug: string };
  roleKey: string;
  roleName: string;
  permissions: PermissionKey[];
  branches: ShellBranch[];
  activeBranchId: string;
  canViewAllBranches: boolean;
  planName: string;
  subscriptionStatus: string;
  unreadCount: number;
  smsCredits: number;
  maintenance: { message: string } | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  permission: PermissionKey;
  badge?: "notifications";
};

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
      { href: "/app/pos", label: "Point of sale", icon: ScanBarcode, permission: "pos.use" },
      { href: "/app/sales", label: "Sales & receipts", icon: ReceiptText, permission: "sales.view" },
    ],
  },
  {
    label: "Stock & buying",
    items: [
      { href: "/app/products", label: "Products", icon: Package, permission: "products.view" },
      { href: "/app/categories", label: "Categories", icon: Tags, permission: "products.view" },
      { href: "/app/inventory", label: "Inventory", icon: Boxes, permission: "inventory.view" },
      { href: "/app/purchases", label: "Purchases", icon: ShoppingBag, permission: "purchases.view" },
      { href: "/app/suppliers", label: "Suppliers", icon: Truck, permission: "suppliers.view" },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/app/expenses", label: "Expenses", icon: Wallet, permission: "expenses.view" },
      { href: "/app/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/app/customers", label: "Customers", icon: Users, permission: "customers.view" },
      { href: "/app/staff", label: "Staff & roles", icon: UserCog, permission: "staff.view" },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        href: "/app/notifications",
        label: "Notifications",
        icon: Bell,
        permission: "notifications.view",
        badge: "notifications",
      },
      { href: "/app/settings", label: "Settings", icon: Settings, permission: "settings.view" },
      {
        href: "/app/subscription",
        label: "Plan & usage",
        icon: CreditCard,
        permission: "subscription.view",
      },
    ],
  },
];

function SidebarContent({
  user,
  tenant,
  roleKey,
  roleName,
  permissions,
  planName,
  subscriptionStatus,
  unreadCount,
  smsCredits,
  activeBranchName,
  onNavigate,
}: {
  user: AppShellProps["user"];
  tenant: AppShellProps["tenant"];
  roleKey: string;
  roleName: string;
  permissions: PermissionKey[];
  planName: string;
  subscriptionStatus: string;
  unreadCount: number;
  smsCredits: number;
  activeBranchName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const can = (permission: PermissionKey) => permissions.includes(permission);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/app" onClick={onNavigate} aria-label="Madetom dashboard" className="rounded-md">
          <Logo inverse />
        </Link>
      </div>

      <div className="mx-4 mb-4 rounded-xl border border-[#29473a] bg-[#10271f] px-3.5 py-3">
        <p className="truncate text-[12.5px] font-semibold text-[#eef4ef]">{tenant.name}</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-[#94ac9f]">
          <MapPin className="size-3" aria-hidden />
          <span className="truncate">{activeBranchName}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold tracking-[0.04em] uppercase",
              subscriptionStatus === "active" && "bg-[#1a4634] text-[#9ed7b4]",
              subscriptionStatus === "trial" && "bg-[#3d3520] text-[#e7cb8b]",
              subscriptionStatus === "past_due" && "bg-[#4a2622] text-[#f0b1a9]",
              subscriptionStatus === "cancelled" && "bg-[#2c3c35] text-[#a9b8b0]",
            )}
          >
            {subscriptionStatus === "past_due" ? "past due" : subscriptionStatus}
          </span>
          <span className="truncate text-[10.5px] text-[#94ac9f]">{planName}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 no-scrollbar" aria-label="Workspace">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => can(item.permission));
          if (!items.length) return null;
          return (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="mb-1.5 px-2.5 text-[9.5px] font-semibold tracking-[0.14em] text-[#6f8b7e] uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    item.href === "/app"
                      ? pathname === "/app"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
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
                      <span className="truncate">{item.label}</span>
                      {item.badge === "notifications" && unreadCount > 0 ? (
                        <span className="ml-auto flex min-w-4.5 items-center justify-center rounded-full bg-[#c8962d] px-1 text-[9.5px] font-bold text-[#1f1705] tabular">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[#223f33] p-3">
        <Link
          href="/app/subscription"
          onClick={onNavigate}
          className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#10271f] px-3 py-2 text-[10.5px] text-[#93aa9d] transition-colors hover:bg-[#143027]"
        >
          <span className="flex items-center gap-1.5">
            <BellRing className="size-3 text-[#c9a95e]" aria-hidden />
            SMS credits
          </span>
          <span className="font-mono text-[11px] font-medium text-[#e6cf98] tabular">{smsCredits}</span>
        </Link>
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <Avatar className="size-8 border border-[#345548]">
            <AvatarFallback className="bg-[#1b3a2d] text-[11px] font-semibold text-[#e8f0ea]">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-medium text-[#eef4ef]">{user.name}</p>
            <p className="truncate text-[10px] text-[#8ba397]">{roleName}</p>
          </div>
          <span className="rounded bg-[#1a3429] px-1.5 py-0.5 text-[9px] font-medium text-[#a9c1b4]">
            {roleKey === "owner" ? "Owner" : "Staff"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  const { children, user, tenant, roleKey, roleName, permissions, branches, activeBranchId, canViewAllBranches, planName, subscriptionStatus, unreadCount, smsCredits, maintenance } = props;
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchPending, startBranchTransition] = useTransition();
  const activeBranch = branches.find((branch) => branch.id === activeBranchId) ?? branches[0];

  const currentSection =
    NAV_GROUPS.flatMap((group) => group.items)
      .filter((item) => item.href !== "/app")
      .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ??
    (pathname === "/app" ? "Dashboard" : "Workspace");

  function handleBranchSwitch(branchId: string) {
    if (branchId === activeBranchId || branchPending) return;
    startBranchTransition(async () => {
      const result = await switchBranchAction(branchId);
      if (result.ok) {
        toast.success("Branch switched.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not switch branches.");
      }
    });
  }

  function handleLogout() {
    void logoutAction();
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">
        <div className="no-print h-full">
          <SidebarContent
            user={user}
            tenant={tenant}
            roleKey={roleKey}
            roleName={roleName}
            permissions={permissions}
            planName={planName}
            subscriptionStatus={subscriptionStatus}
            unreadCount={unreadCount}
            smsCredits={smsCredits}
            activeBranchName={activeBranch?.name ?? "No branch"}
          />
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[280px] border-0 bg-sidebar p-0 sm:max-w-[280px]">
          <SidebarContent
            user={user}
            tenant={tenant}
            roleKey={roleKey}
            roleName={roleName}
            permissions={permissions}
            planName={planName}
            subscriptionStatus={subscriptionStatus}
            unreadCount={unreadCount}
            smsCredits={smsCredits}
            activeBranchName={activeBranch?.name ?? "No branch"}
            onNavigate={() => setMobileOpen(false)}
          />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="absolute top-4 right-3 flex size-8 items-center justify-center rounded-lg text-[#a9bdb1] hover:bg-[#173429] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-[264px]">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-[#f6f7f3]/92 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-[var(--shadow-card)] lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="hidden min-w-0 items-center gap-2 text-[12px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <Store className="size-3.5" aria-hidden />
                {tenant.name}
              </span>
              <span className="text-border">/</span>
              <span className="font-medium text-foreground">{currentSection}</span>
            </div>
            <span className="truncate text-[13px] font-semibold sm:hidden">{tenant.name}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {branches.length > 1 && canViewAllBranches ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[12px] font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-muted/50",
                    branchPending && "opacity-60",
                  )}
                  aria-label="Switch branch"
                >
                  <MapPin className="size-3.5 text-primary" aria-hidden />
                  <span className="hidden max-w-[130px] truncate sm:inline">{activeBranch?.name}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Active branch</DropdownMenuLabel>
                  {branches.map((branch) => (
                    <DropdownMenuItem
                      key={branch.id}
                      onClick={() => handleBranchSwitch(branch.id)}
                      className="cursor-pointer py-2"
                    >
                      <span className="flex size-6 items-center justify-center rounded-md bg-muted text-[9px] font-semibold text-muted-foreground">
                        {branch.code}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px]">{branch.name}</span>
                      {branch.id === activeBranchId ? (
                        <Check className="size-3.5 text-primary" aria-hidden />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="hidden h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[12px] font-medium text-muted-foreground sm:flex">
                <MapPin className="size-3.5 text-primary" aria-hidden />
                {activeBranch?.name ?? "No branch"}
              </span>
            )}

            <Link
              href="/app/notifications"
              aria-label={
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
              }
              className="relative flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-[var(--shadow-card)] transition-colors hover:text-foreground"
            >
              <Bell className="size-4" aria-hidden />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full border border-[#f6f7f3] bg-[#c8962d] px-1 text-[9px] font-bold text-[#1f1705] tabular">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-lg p-1 pr-1.5 transition-colors hover:bg-muted/60"
              >
                <Avatar className="size-7 border border-border">
                  <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="px-2 py-2">
                  <p className="truncate text-[13px] font-semibold">{user.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-[10.5px] font-medium text-primary">{roleName}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/app/settings")} className="cursor-pointer py-2">
                  <Settings className="size-4" aria-hidden />
                  Business settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/app/notifications")} className="cursor-pointer py-2">
                  <Bell className="size-4" aria-hidden />
                  Notifications
                  {unreadCount > 0 ? (
                    <span className="ml-auto rounded-full bg-gold-soft px-1.5 text-[10px] font-semibold text-[#7c5a13] tabular">
                      {unreadCount}
                    </span>
                  ) : null}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/app/subscription")} className="cursor-pointer py-2">
                  <CreditCard className="size-4" aria-hidden />
                  Plan & usage
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleLogout}
                  className="cursor-pointer py-2"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {maintenance ? <MaintenanceBanner message={maintenance.message} /> : null}

        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7 print:p-0">
          {children}
        </main>
      </div>

      {branchPending ? (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/20">
          <div className="h-full w-1/2 animate-pulse bg-primary" />
        </div>
      ) : null}
    </div>
  );
}
