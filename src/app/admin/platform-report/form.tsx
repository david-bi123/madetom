"use client";

import { useState } from "react";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";

type PlatformReport = {
  tenants: number;
  activeTenants: number;
  smsSentToday: number;
  smsFailedToday: number;
  superAdminNotified: boolean;
};

export function SendPlatformReportForm() {
  const [serverError, setServerError] = useState<string>();
  const [result, setResult] = useState<{ ok: boolean; report?: PlatformReport; error?: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    setServerError(undefined);
    setResult(undefined);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/send-platform-report", {
        method: "POST",
      });
      const json = await response.json();
      setResult(json);
      if (!json.ok) setServerError(json.error);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to send report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <FormError message={serverError} />
      {result ? (
        <div className={`rounded-xl p-4 border ${result.ok ? "border-success-soft bg-success-soft" : "border-destructive-soft bg-destructive-soft"}`}>
          <p className={`text-sm ${result.ok ? "text-success" : "text-destructive"}`}>
            {result.ok
              ? `Report sent to your phone. Workspaces: ${result.report?.activeTenants} active / ${result.report?.tenants} total · SMS sent: ${result.report?.smsSentToday}, failed: ${result.report?.smsFailedToday}`
              : result.error}
          </p>
        </div>
      ) : null}
      <Button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        size="lg"
        className="h-11 w-full"
      >
        {isSubmitting ? "Sending report…" : "Send platform report now"}
      </Button>
    </div>
  );
}
