import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { BriefSource } from "@workspace/api-client-react";

const SOURCE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  web: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", label: "Web" },
  linkedin: { color: "#0a66c2", bg: "#e8f4fc", border: "#b3daf5", label: "LinkedIn" },
  job_posting: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", label: "Jobs" },
  press: { color: "#b45309", bg: "#fffbeb", border: "#fde68a", label: "Press" },
  registry: { color: "#047857", bg: "#ecfdf5", border: "#a7f3d0", label: "Registry" },
  own_intel: { color: "#be185d", bg: "#fdf2f8", border: "#fbcfe8", label: "Intel" },
};

export function MapSourceChips({ sources, sectionId }: { sources?: BriefSource[]; sectionId: string }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  const verifiedCount = sources.filter(s => s.confidence === "verified").length;
  const assumedCount = sources.filter(s => s.confidence === "assumed").length;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex gap-1 flex-wrap">
          {sources.slice(0, 4).map((s, i) => {
            const cfg = SOURCE_CONFIG[s.type] || SOURCE_CONFIG.web;
            return (
              <span
                key={`${sectionId}-${i}`}
                style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}` }}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              >
                {cfg.label}
              </span>
            );
          })}
          {sources.length > 4 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              +{sources.length - 4}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        <span>{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
        {verifiedCount > 0 && <span className="text-green-600 font-medium">· {verifiedCount} verified</span>}
        {assumedCount > 0 && <span className="text-orange-500 font-medium">· {assumedCount} inferred</span>}
      </button>

      {open && (
        <div className="mt-2 bg-muted/30 rounded-lg border border-border overflow-hidden">
          {sources.map((s, i) => {
            const cfg = SOURCE_CONFIG[s.type] || SOURCE_CONFIG.web;
            return (
              <div
                key={`${sectionId}-detail-${i}`}
                className="flex items-start gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <span
                  style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}` }}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0"
                >
                  {cfg.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground mb-0.5">{s.label}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{s.detail}</div>
                  {s.url && s.url.startsWith("http") && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      View source
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
