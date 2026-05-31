import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BearMark } from "@/components/bear-mark";

export interface PageHeroProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  showBear?: boolean;
  bearSize?: number;
  className?: string;
  children?: ReactNode;
}

export function PageHero({
  title,
  subtitle,
  eyebrow,
  showBear = false,
  bearSize = 44,
  className,
  children,
}: PageHeroProps) {
  return (
    <div
      className={cn(
        "text-center mx-auto w-full max-w-[var(--hero-max-width)] px-4",
        className,
      )}
    >
      {showBear && <BearMark size={bearSize} className="mx-auto mb-4" />}
      {eyebrow && (
        <p className="text-sm font-semibold tracking-wide text-muted-foreground mb-3">
          {eyebrow}
        </p>
      )}
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 text-lg font-normal text-muted-foreground leading-snug max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
