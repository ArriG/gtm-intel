import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const briefCardClass = "rounded-2xl border border-[#E2E8F0] bg-white shadow-none";
export const briefCardTitleClass = "text-base font-semibold text-[#2D3748]";
export const briefCardBodyClass = "text-sm text-[#5A677C] leading-relaxed";
export const briefCardLabelClass = "text-xs text-[#5A677C] font-normal";

export function BriefCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(briefCardClass, className)} {...props} />;
}

export function BriefCardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-row items-center justify-between px-6 pt-6 pb-3", className)} {...props} />;
}

export function BriefCardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn(briefCardTitleClass, "flex items-center gap-2", className)} {...props} />;
}

export function BriefCardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6 pt-0", className)} {...props} />;
}
