import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

/** This screen reads request-time data, so it is a blocking route. */

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password reset code for your Madetom account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">Account recovery</p>
        <h1 className="mt-2.5 font-heading text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[34px]">
          Reset your password.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          Enter the email on your account. We&apos;ll text a 6-digit code to the phone number on
          file so you can set a new password.
        </p>
      </div>

      <div className="mb-6 flex gap-3 rounded-xl border border-border bg-white/70 p-4">
        <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          The code expires after 15 minutes. We never show whether an email is registered, so the
          same confirmation appears either way.
        </p>
      </div>

      <ForgotPasswordForm />

      <Link
        href="/login"
        className="mt-8 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to sign in
      </Link>
    </div>
  );
}
