import { cn } from "@/lib/utils";
import {
  briefStatusLabel,
  briefStatusPillVariant,
  BRIEF_STATUS_PILL_CLASSES,
  type BriefStatus,
} from "@/lib/brief-status";

export function BriefStatusPill({
  status,
  className,
}: {
  status: BriefStatus;
  className?: string;
}) {
  const variant = briefStatusPillVariant(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none whitespace-nowrap",
        BRIEF_STATUS_PILL_CLASSES[variant],
        className,
      )}
    >
      {briefStatusLabel(status)}
    </span>
  );
}
