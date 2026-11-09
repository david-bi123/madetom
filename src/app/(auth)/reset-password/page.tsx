import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { FormSuccess } from "@/components/forms/field";

/** This screen reads request-time data, so it is a blocking route. */
export const instant = false;

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Enter the SMS code sent to your phone and choose a new Madetom password.",
  robots: { index: false, follow: false },
};

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const sent = params.sent === "1";

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">Account recovery</p>
        <h1 className="mt-2.5 font-heading text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[34px]">
          Choose a new password.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          Enter the code from your SMS and set a new password. All other signed-in devices will be
          signed out.
        </p>
      </div>

      {sent ? (
        <div className="mb-6">
          <FormSuccess message="If that email belongs to an active account, a reset code is on its way by SMS. It expires in 15 minutes." />
        </div>
      ) : null}

      <ResetPasswordForm initialEmail={email} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to sign in
        </Link>
        <Link
          href="/forgot-password"
          className="rounded text-[13px] font-medium text-primary underline-offset-4 hover:underline"
        >
          Didn&apos;t get the code? Send a new one
        </Link>
      </div>
    </div>
  );
}
