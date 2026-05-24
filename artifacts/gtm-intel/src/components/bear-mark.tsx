import { cn } from "@/lib/utils";

interface BearMarkProps {
  size?: number;
  className?: string;
  /** Show the cream circle backdrop (hero / sidebar header). */
  withCircle?: boolean;
}

/**
 * Minimal essentialist bear face — dot eyes, overlapping ear ellipses, soft muzzle.
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
        <circle cx="16" cy="16" r="15" className="fill-muted" />
      )}

      {/* Ears — larger pads behind the face */}
      <ellipse cx="9.6" cy="11.2" rx="4.3" ry="4.6" className="fill-primary" />
      <ellipse cx="22.4" cy="11.2" rx="4.3" ry="4.6" className="fill-primary" />

      {/* Face */}
      <ellipse cx="16" cy="17.5" rx="9.2" ry="9.8" className="fill-primary" />

      {/* Dot eyes */}
      <circle cx="12.4" cy="16.2" r="1.4" className="fill-muted" />
      <circle cx="19.6" cy="16.2" r="1.4" className="fill-muted" />

      {/* Muzzle + nose */}
      <ellipse cx="16" cy="21.4" rx="3.6" ry="2.7" className="fill-muted" />
      <ellipse cx="16" cy="20.5" rx="1.1" ry="0.85" className="fill-primary" />
    </svg>
  );
}
