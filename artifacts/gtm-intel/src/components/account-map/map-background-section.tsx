import { ChevronDown, ExternalLink, Compass } from "lucide-react";
import type { AccountMapResponse } from "@workspace/api-client-react";
import { BriefCard, BriefCardContent, BriefCardHeader, BriefCardTitle } from "@/components/brief-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapSourceChips } from "./map-source-chips";

function ConfidenceBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    high: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-red-100 text-red-700 border-red-200",
    assumed: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[level] || styles.assumed}`}>
      {level} confidence
    </span>
  );
}

export function MapBackgroundSection({ map }: { map: AccountMapResponse }) {
  const entitySourceCount = map.entities.reduce((total, entity) => total + entity.sources.length, 0);
  const groupedSources = [
    ...map.groupBackground.sources,
    ...map.companySnapshot.sources,
  ];

  return (
    <Collapsible defaultOpen={false}>
      <BriefCard>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left px-6 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors rounded-2xl"
          >
            <div>
              <p className="text-sm font-bold text-foreground">Background & sources</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Group context, outreach sources, and {groupedSources.length + entitySourceCount} references from this map
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
            <BriefCard>
              <BriefCardHeader>
                <BriefCardTitle>
                  <Compass className="w-4 h-4 text-primary" />
                  Their world
                  {map.groupBackground.confidence && (
                    <ConfidenceBadge level={map.groupBackground.confidence} />
                  )}
                </BriefCardTitle>
              </BriefCardHeader>
              <BriefCardContent>
                <ul className="space-y-1.5">
                  {map.groupBackground.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="break-words">{bullet}</span>
                    </li>
                  ))}
                </ul>
                <MapSourceChips sources={map.groupBackground.sources} sectionId="map-world" />
              </BriefCardContent>
            </BriefCard>

            {map.outreachSources.length > 0 && (
              <BriefCard className="border-dashed bg-muted/20">
                <BriefCardHeader>
                  <BriefCardTitle>Sources worth checking next</BriefCardTitle>
                </BriefCardHeader>
                <BriefCardContent className="space-y-3">
                  {map.outreachSources.map((source, i) => (
                    <div key={`${source.label}-${i}`} className="text-sm break-words">
                      <p className="font-medium text-foreground">{source.label}</p>
                      <p className="text-muted-foreground leading-relaxed mt-0.5">{source.detail}</p>
                      {source.relatedEntity && (
                        <p className="text-xs text-muted-foreground mt-1">Related to: {source.relatedEntity}</p>
                      )}
                      {source.url && source.url.startsWith("http") && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          Open source
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </BriefCardContent>
              </BriefCard>
            )}
          </div>
        </CollapsibleContent>
      </BriefCard>
    </Collapsible>
  );
}
