import { Globe } from "lucide-react";
import type { MapCompanySnapshot } from "@workspace/api-client-react";
import { BriefCard, BriefCardContent, BriefCardHeader, BriefCardTitle } from "@/components/brief-card";
import { MapSourceChips } from "./map-source-chips";

export function MapCompanySnapshotCard({ snapshot }: { snapshot: MapCompanySnapshot }) {
  const tech = snapshot.techStack?.trim();
  const showTech = tech && tech !== "Not detected";
  const pains = snapshot.possiblePainPoints?.filter(Boolean) ?? [];
  const hasPains = pains.length > 0;

  return (
    <BriefCard>
      <BriefCardHeader>
        <BriefCardTitle><Globe className="w-4 h-4 text-primary" />Company snapshot</BriefCardTitle>
      </BriefCardHeader>
      <BriefCardContent>
        <div className={`grid gap-5 ${hasPains ? "grid-cols-1 sm:grid-cols-2 sm:gap-6" : "grid-cols-1"}`}>
          <div className="space-y-3 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Group profile</p>
            <p className="text-sm text-foreground leading-snug break-words">
              {[snapshot.size, snapshot.industry, snapshot.location, snapshot.fundingStage].filter(Boolean).join(" · ")}
            </p>
            {showTech && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Tech stack</p>
                <p className="text-sm font-medium text-foreground leading-snug break-words">{tech}</p>
              </div>
            )}
          </div>

          {hasPains && (
            <div className="min-w-0 rounded-xl border border-border bg-secondary/50 p-4 sm:py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Possible pain points</p>
              <ul className="space-y-2">
                {pains.map((pain, i) => (
                  <li key={i} className="text-sm text-foreground leading-snug pl-3 border-l-2 border-primary/40 break-words">
                    {pain}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <MapSourceChips sources={snapshot.sources ?? []} sectionId="map-snapshot" />
      </BriefCardContent>
    </BriefCard>
  );
}
