import type { AccountMapResponse } from "@workspace/api-client-react";
import { BriefCard, BriefCardContent } from "@/components/brief-card";
import { Button } from "@/components/ui/button";
import { MAP_REGION_OPTIONS, regionLabel, type MapRegion } from "@/lib/map-region";
import { AccountMapDiagram } from "./account-map-diagram";
import { LimitationsCard } from "./limitations-card";
import { MapBackgroundSection } from "./map-background-section";
import { MapCompanySnapshotCard } from "./map-company-snapshot";
import { MapUnmappedSection } from "./map-unmapped-section";
import { ParentSummaryCard } from "./parent-summary-card";
import { SingleEntityFallback } from "./single-entity-fallback";

export function AccountMapResult({
  map,
  onSwitchToBrief,
  companyLabel,
  currentRegion,
  onMapAnotherRegion,
}: {
  map: AccountMapResponse;
  onSwitchToBrief: () => void;
  companyLabel?: string;
  currentRegion?: MapRegion;
  onMapAnotherRegion?: (region: MapRegion) => void;
}) {
  const otherRegions = currentRegion
    ? MAP_REGION_OPTIONS.filter(o => o.value !== currentRegion)
    : [];
  const showSingleEntityFallback = map.isSingleEntity && map.entities.length === 0;

  if (showSingleEntityFallback) {
    return <SingleEntityFallback onSwitchToBrief={onSwitchToBrief} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-w-0">
      <ParentSummaryCard parent={map.parent} sectorPackUsed={map.sectorPackUsed} />
      <p className="text-xs text-muted-foreground">
        Expand any entity card to see verified leadership, context, and sources.
      </p>
      <AccountMapDiagram map={map} />
      <MapUnmappedSection map={map} />
      <LimitationsCard limitations={map.limitations} />
      <MapCompanySnapshotCard snapshot={map.companySnapshot} />
      <MapBackgroundSection map={map} />
      {onMapAnotherRegion && companyLabel && otherRegions.length > 0 && (
        <BriefCard className="border-dashed bg-muted/10">
          <BriefCardContent className="pt-5 space-y-3">
            <p className="text-sm font-medium text-foreground">Map another region</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This map focused on {currentRegion ? regionLabel(currentRegion) : "one region"} for{" "}
              <span className="font-medium text-foreground">{companyLabel}</span>. Run a separate map to go deep
              elsewhere without mixing geographies.
            </p>
            <div className="flex flex-wrap gap-2">
              {otherRegions.map(option => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMapAnotherRegion(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </BriefCardContent>
        </BriefCard>
      )}
      <p className="text-xs text-muted-foreground">
        Generated {new Date(map.generatedAt).toLocaleString("en-GB")} · Sector pack: {map.sectorPackUsed}
      </p>
    </div>
  );
}
