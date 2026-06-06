import { ChevronDown, ExternalLink } from "lucide-react";
import type { AccountMapResponse } from "@workspace/api-client-react";
import { BriefCard, BriefCardContent, BriefCardHeader, BriefCardTitle } from "@/components/brief-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapSourceChips } from "./map-source-chips";

export function MapBackgroundSection({ map }: { map: AccountMapResponse }) {
  const entitySourceCount = map.entities.reduce((total, entity) => total + entity.sources.length, 0);
  const snapshotSourceCount = map.companySnapshot.sources?.length ?? 0;
  const referenceCount = snapshotSourceCount + entitySourceCount;

  return (
    <Collapsible defaultOpen={false}>
      <BriefCard>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left px-6 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors rounded-2xl"
          >
            <div>
              <p className="text-sm font-bold text-foreground">Outreach sources</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Where to find unmapped entities and {referenceCount} references from this map
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
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

            {snapshotSourceCount > 0 && (
              <MapSourceChips sources={map.companySnapshot.sources} sectionId="map-snapshot-bg" />
            )}
          </div>
        </CollapsibleContent>
      </BriefCard>
    </Collapsible>
  );
}
