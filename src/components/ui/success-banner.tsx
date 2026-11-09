import { CircleCheck } from "lucide-react";

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#cfe7d8] bg-success-soft px-3.5 py-3 text-[13px] leading-relaxed font-medium text-[#12623c]"
    >
      <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
