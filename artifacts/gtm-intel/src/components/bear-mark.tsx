import { cn } from "@/lib/utils";

interface BearMarkProps {
  size?: number;
  className?: string;
  /** Show the outer circle backdrop (hero / sidebar header). */
  withCircle?: boolean;
  /**
   * brand — round presentation of the supplied logo (default).
   * subtle — unframed logo for compact inline use.
   */
  variant?: "brand" | "subtle";
}

/**
 * Bear First: a friendly space bear with a gold signal and twinkling eye.
 */
export function BearMark({
  size = 24,
  className,
  withCircle = true,
  variant = "brand",
}: BearMarkProps) {
  const showCircle = withCircle && variant === "brand";

  return (
    <span
      className={cn("inline-flex shrink-0", showCircle && "rounded-full overflow-hidden", className)}
      aria-hidden
    >
      <img
        width={size}
        height={size}
        src={`${import.meta.env.BASE_URL}g3po-logo.png`}
        alt=""
      />
    </span>
  );
}
