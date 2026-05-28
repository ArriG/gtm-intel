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
    <div className="mb-6">
      <div className="inline-flex rounded-xl border border-border bg-background p-1 gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("brief")}
          className={cn(
            "rounded-lg px-4 py-2 text-left transition-colors min-w-[140px]",
            mode === "brief"
              ? "bg-primary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
          )}
        >
          <span className="block text-sm font-semibold">Brief</span>
          <span className="block text-[11px] opacity-80">~30 seconds</span>
          <span className="block text-[11px] opacity-70">Single view</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("mapping")}
          className={cn(
            "rounded-lg px-4 py-2 text-left transition-colors min-w-[140px]",
            mode === "mapping"
              ? "bg-primary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
          )}
        >
          <span className="block text-sm font-semibold">Mapping</span>
          <span className="block text-[11px] opacity-80">~2 minutes</span>
          <span className="block text-[11px] opacity-70">Enterprise structure</span>
        </button>
      </div>
    </div>
  );
}
