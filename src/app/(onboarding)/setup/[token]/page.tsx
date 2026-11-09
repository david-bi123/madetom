import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  CircleHelp,
  LockKeyhole,
  ShieldAlert,
  Store,
  UserRound,
} from "lucide-react";
import { OwnerSetupWizard, StaffSetupWizard } from "@/components/setup/setup-wizard";
import { Button } from "@/components/ui/button";
import {
  findInvitationByToken,
  invitationBlockMessage,
  invitationBlockReason,
  type InvitationBlockReason,
} from "@/lib/services/invitations";
import { ROLE_CATALOG, isRoleKey } from "@/lib/permissions";
import { formatDate } from "@/lib/dates";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export const metadata: Metadata = {
  title: "Set up your workspace",
  description: "Finish setting up your Madetom business workspace.",
  robots: { index: false, follow: false },
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@madetom.app";

type SetupPageProps = {
  params: Promise<{ token: string }>;
};

function Unavailable({ reason }: { reason: InvitationBlockReason }) {
  const title =
    reason === "accepted"
      ? "This invitation is already used"
      : reason === "expired"
        ? "This link has expired"
        : reason === "revoked"
          ? "This invitation was revoked"
          : reason === "suspended"
            ? "This workspace is suspended"
            : "We can’t find this invitation";

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-xl border border-[#edd9b0] bg-[#fbf4e4] text-[#8a6416]">
          <ShieldAlert className="size-5" aria-hidden />
        </span>
        <h1 className="mt-5 font-heading text-[26px] font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          {invitationBlockMessage(reason)}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button render={<Link href="/login" />} className="h-10" nativeButton={false}>
            Go to sign in
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            className="h-10"
            render={
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Madetom setup link help`} />
            }
          >
            <CircleHelp className="size-4" aria-hidden />
            Ask for a new link
          </Button>
        </div>
      </div>
    </div>
  );
}

export default async function SetupPage({ params }: SetupPageProps) {
  const { token } = await params;
  const lookup = await findInvitationByToken(token);
  const reason = invitationBlockReason(lookup);

  if (reason || !lookup) {
    return <Unavailable reason={reason ?? "not_found"} />;
  }

  const { invitation, tenant, branch, plan } = lookup;
  const isOwner = invitation.type === "owner";
  const roleName = isRoleKey(invitation.roleKey)
    ? ROLE_CATALOG[invitation.roleKey].name
    : "Team member";

  const context = {
    token,
    type: invitation.type,
    invitationName: invitation.name,
    email: invitation.email ?? "",
    phone: invitation.phone,
    roleName,
    tenantName: tenant.name,
    businessType: tenant.businessType,
    region: tenant.region ?? "Greater Accra",
    location: tenant.location ?? "",
    branchName: branch?.name ?? (isOwner ? "Main Shop" : ""),
    branchAddress: branch?.address ?? tenant.location ?? "",
    taxRate: tenant.taxRate ? String(Number(tenant.taxRate)) : "0",
    pricesIncludeTax: tenant.pricesIncludeTax,
    allowPartialPayments: tenant.allowPartialPayments,
    expiresAtLabel: formatDate(invitation.expiresAt, "long"),
  };

  return (
    <div>
      <div className="mb-7 max-w-2xl">
        <p className="eyebrow">{isOwner ? "Owner onboarding" : "Staff onboarding"}</p>
        <h1 className="mt-2.5 font-heading text-[30px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[36px]">
          {isOwner ? `Open ${tenant.name} on Madetom.` : `Join ${tenant.name} on Madetom.`}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          {isOwner
            ? "Three short steps: your account, the business details, then a final check. It takes about two minutes."
            : "Confirm your account details and you’re in. Your role and branch have already been chosen by the business."}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {isOwner ? <OwnerSetupWizard context={context} /> : <StaffSetupWizard context={context} />}

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-[#24463a] bg-[#0b1f19] px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#9eb5a8] uppercase">
                Workspace
              </p>
              <p className="mt-1 font-heading text-[17px] font-semibold tracking-[-0.02em] text-[#f4f7f3]">
                {tenant.name}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#91a99c]">
                {tenant.businessType || "Business workspace"}
                {tenant.region ? ` · ${tenant.region}` : ""}
              </p>
            </div>
            <dl className="divide-y divide-border/80 px-4">
              <div className="flex items-start gap-3 py-3.5">
                <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-[11px] text-muted-foreground">Your role</dt>
                  <dd className="mt-0.5 text-[12.5px] font-medium">{roleName}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3.5">
                <Store className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-[11px] text-muted-foreground">Branch</dt>
                  <dd className="mt-0.5 text-[12.5px] font-medium">
                    {branch?.name ?? (isOwner ? "Created during setup" : "Assigned by the owner")}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3.5">
                <Boxes className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-[11px] text-muted-foreground">Plan</dt>
                  <dd className="mt-0.5 text-[12.5px] font-medium">{plan?.name ?? "Trial workspace"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3.5">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-[11px] text-muted-foreground">Link expires</dt>
                  <dd className="mt-0.5 text-[12.5px] font-medium">{formatDate(invitation.expiresAt, "long")}</dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-[#fbfcf9] px-4 py-4">
            <p className="flex items-center gap-2 text-[12px] font-semibold">
              <LockKeyhole className="size-3.5 text-primary" aria-hidden />
              A secure, single-use link
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
              This page is tied to your invitation. Once setup is complete the link stops working.
              Never forward the SMS to someone else.
            </p>
          </div>

          <p className="px-1 text-[11.5px] leading-relaxed text-muted-foreground">
            Stuck?{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Madetom workspace setup`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Contact Madetom support
            </a>
            . Include the business name, not your password or setup link.
          </p>
        </aside>
      </div>
    </div>
  );
}

