import { cn } from "@/lib/utils";

interface BearMarkProps {
  size?: number;
  className?: string;
  /** Show the cream circle backdrop (hero / sidebar header). */
  withCircle?: boolean;
}

/**
 * Design D — forehead slit gaze: slit eyes high under ears, compact muzzle,
 * maximum chin room so the bear reads as looking up.
 */
export function BearMark({ size = 24, className, withCircle = true }: BearMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {withCircle && (
        <circle cx="16" cy="16" r="15" className="fill-bear-muted" />
      )}

      <ellipse cx="9.2" cy="11" rx="4" ry="4.3" className="fill-bear" />
      <ellipse cx="22.8" cy="11" rx="4" ry="4.3" className="fill-bear" />
      <ellipse cx="16" cy="18.8" rx="9" ry="10.2" className="fill-bear" />
      <rect x="11.4" y="12.6" width="2.4" height="0.75" rx="0.38" className="fill-bear-muted" />
      <rect x="18.2" y="12.6" width="2.4" height="0.75" rx="0.38" className="fill-bear-muted" />
      <ellipse cx="16" cy="15.6" rx="2.8" ry="2" className="fill-bear-muted" />
      <ellipse cx="16" cy="14.9" rx="0.95" ry="0.7" className="fill-bear" />
    </svg>
  );
}
