import type { MapCompanySnapshot } from "@workspace/api-client-react";
import { MapSourceChips } from "./map-source-chips";

/** Snapshot body rendered under the parent company header (no separate card). */
export function MapCompanySnapshotInline({ snapshot }: { snapshot: MapCompanySnapshot }) {
  const tech = snapshot.techStack?.trim();
  const showTech = tech && tech !== "Not detected";
  const pains = snapshot.possiblePainPoints?.filter(Boolean) ?? [];
  const hasPains = pains.length > 0;
  const profileLine = [snapshot.size, snapshot.industry, snapshot.location, snapshot.fundingStage]
    .filter(Boolean)
    .join(" · ");

  if (!profileLine && !showTech && !hasPains && !(snapshot.sources?.length ?? 0)) {
    return null;
  }

  return (
    <div className={`space-y-3 pt-1 ${hasPains ? "sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0" : ""}`}>
      <div className="space-y-3 min-w-0">
        {profileLine && (
          <p className="text-sm text-foreground leading-relaxed break-words">{profileLine}</p>
        )}
        {showTech && (
          <p className="text-sm text-muted-foreground leading-snug break-words">
            <span className="font-semibold text-foreground/80">Tech stack:</span> {tech}
          </p>
        )}
        <MapSourceChips sources={snapshot.sources ?? []} sectionId="map-snapshot-inline" />
      </div>

      {hasPains && (
        <div className="min-w-0 rounded-xl border border-border bg-secondary/50 p-4 sm:py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Possible pain points
          </p>
          <ul className="space-y-2">
            {pains.map((pain, i) => (
              <li
                key={i}
                className="text-sm text-foreground leading-snug pl-3 border-l-2 border-primary/40 break-words"
              >
                {pain}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
