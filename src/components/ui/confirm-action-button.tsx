"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type ConfirmActionButtonProps = {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "ghost" | "outline" | "destructive" | "destructive-soft";
};

/**
 * A destructive action guarded by an explicit confirmation step. The server
 * action still re-checks permissions, so hiding the button is never the
 * security boundary.
 */
export function ConfirmActionButton({
  action,
  fields,
  triggerLabel,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "ghost",
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant={variant} size="sm" />}>
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={action} className="contents">
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <AlertDialogAction
              type="submit"
              variant="destructive"
              onClick={() => setOpen(false)}
            >
              {confirmLabel}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
