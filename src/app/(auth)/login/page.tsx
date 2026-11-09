import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { FormSuccess } from "@/components/forms/field";

/** This screen reads request-time data, so it is a blocking route. */

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Madetom business workspace or platform console.",
  robots: { index: false, follow: false },
};

const errorMessages: Record<string, string> = {
  "no-workspace":
    "Your account is not linked to an active business workspace. Contact your business owner or Madetom support.",
  "setup-incomplete":
    "Your business setup is not complete. Open the secure invitation link sent to the owner by SMS.",
  "no-branch": "Your workspace has no active branch yet. Contact your business owner.",
  "session-expired": "Your session ended. Sign in again to continue where you left off.",
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const reset = params.reset === "1";
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const errorMessage = errorKey ? errorMessages[errorKey] : undefined;

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">Business workspace</p>
        <h1 className="mt-2.5 font-heading text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[34px]">
          Welcome back.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          Sign in to pick up at the counter, in the store room or on the day&apos;s numbers.
        </p>
      </div>

      <div className="space-y-5">
        {reset ? (
          <FormSuccess message="Your password was updated. Sign in with your new password." />
        ) : null}
        {errorMessage ? (
          <div
            role="alert"
            className="rounded-xl border border-[#f1d2cf] bg-danger-soft px-3.5 py-3 text-[13px] leading-relaxed font-medium text-destructive"
          >
            {errorMessage}
          </div>
        ) : null}
        <LoginForm />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-white/70 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-[13px] font-semibold text-foreground">Access is by invitation</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Business owners are onboarded by the Madetom team. Staff accounts are created inside
              the workspace by an owner or manager.
            </p>
            <Link
              href="/#pricing"
              className="mt-2 inline-flex rounded text-[12.5px] font-medium text-primary underline-offset-4 hover:underline"
            >
              See plans and request access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
