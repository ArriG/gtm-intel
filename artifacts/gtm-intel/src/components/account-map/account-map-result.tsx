import { useState } from "react";
import type { AccountMapResponse } from "@workspace/api-client-react";
import { AccountMapDiagram } from "./account-map-diagram";
import { EntityDetailsSection } from "./entity-details-section";
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
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);

  function handleExpandEntity(entityId: string) {
    setExpandedEntityId(entityId);
    const target = document.getElementById(`entity-${entityId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const showSingleEntityFallback = map.isSingleEntity && map.entities.length === 0;

  if (showSingleEntityFallback) {
    return <SingleEntityFallback onSwitchToBrief={onSwitchToBrief} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ParentSummaryCard parent={map.parent} sectorPackUsed={map.sectorPackUsed} />
      <AccountMapDiagram map={map} onExpandEntity={handleExpandEntity} />
      <EntityDetailsSection
        entities={map.entities}
        expandedEntityId={expandedEntityId}
        onExpandedEntityIdChange={setExpandedEntityId}
      />
      <LimitationsCard limitations={map.limitations} />
      <p className="text-xs text-muted-foreground">
        Generated {new Date(map.generatedAt).toLocaleString("en-GB")} · Sector pack: {map.sectorPackUsed}
      </p>
    </div>
  );
}
