"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refundSaleAction } from "@/app/(business)/app/pos/actions";
import { Button } from "@/components/ui/button";
import { formatMinor } from "@/lib/format";

export function SaleRefundButton({ saleId, refundAmountMinor }: { saleId: string; refundAmountMinor: number }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();

  async function refund() {
    setError(undefined);
    startTransition(async () => {
      const result = await refundSaleAction(saleId);
      if (result && !result.ok) {
        setError(result.error ?? "The refund could not be completed.");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="rounded-xl border border-[#f1d2cf] bg-danger-soft p-4">
        <p className="text-[13px] font-semibold text-destructive">Refund this sale?</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#7a3a30]">
          The full amount of <strong>{formatMinor(refundAmountMinor)}</strong> will be returned to stock.
          This keeps the inventory ledger consistent.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="destructive" loading={busy} onClick={refund}>
            Confirm refund
          </Button>
          <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
            Keep sale
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button type="button" variant="destructive-soft" onClick={() => setConfirming(true)} disabled={busy}>
        Refund sale
      </Button>
      {error ? <p className="mt-2 text-[12px] font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
