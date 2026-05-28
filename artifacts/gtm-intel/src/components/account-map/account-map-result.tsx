import type { AccountMapResponse } from "@workspace/api-client-react";
import { AccountMapDiagram } from "./account-map-diagram";
import { LimitationsCard } from "./limitations-card";
import { ParentSummaryCard } from "./parent-summary-card";
import { SingleEntityFallback } from "./single-entity-fallback";

export function AccountMapResult({
  map,
  onSwitchToBrief,
}: {
  map: AccountMapResponse;
  onSwitchToBrief: () => void;
}) {
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
      <LimitationsCard limitations={map.limitations} />
      <p className="text-xs text-muted-foreground">
        Generated {new Date(map.generatedAt).toLocaleString("en-GB")} · Sector pack: {map.sectorPackUsed}
      </p>
    </div>
  );
}
