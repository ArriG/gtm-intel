import { cn } from "@/lib/utils";

export type SearchMode = "brief" | "mapping";

export function SearchModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="shrink-0">
      <div className="inline-flex rounded-full border border-border bg-muted/50 p-1 gap-0.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("mapping")}
          className={cn(
            "rounded-full px-4 py-2.5 text-left transition-colors min-w-[148px] relative",
            mode === "mapping"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-foreground hover:bg-background/80",
          )}
        >
          {mode === "mapping" && (
            <span className="absolute -top-2.5 right-3 rounded-full bg-foreground px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-background">
              Recommended
            </span>
          )}
          <span className="block text-sm font-semibold">Mapping</span>
          <span className="block text-[11px] opacity-80">~2 minutes</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("brief")}
          className={cn(
            "rounded-full px-4 py-2.5 text-left transition-colors min-w-[128px]",
            mode === "brief"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/80",
          )}
        >
          <span className="block text-sm font-semibold">Brief</span>
          <span className="block text-[11px] opacity-80">~30 seconds</span>
        </button>
      </div>
    </div>
  );
}
