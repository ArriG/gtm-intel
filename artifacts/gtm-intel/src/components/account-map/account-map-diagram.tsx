import type { AccountMapResponse } from "@workspace/api-client-react";
import { EntityCardCompact } from "./entity-card-compact";
import { groupEntitiesByRegion, REGION_LABELS, REGION_ORDER } from "@/lib/account-map-labels";

export function AccountMapDiagram({ map }: { map: AccountMapResponse }) {
  const grouped = groupEntitiesByRegion(map.entities);
  const regionsWithEntities = REGION_ORDER.filter(region => (grouped.get(region)?.length ?? 0) > 0);

  return (
    <div className="map-diagram space-y-6">
      <div className="parent-header text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight">{map.parent.name}</h2>
        <p className="text-sm text-muted-foreground">
          {map.parent.headquartersCountry} · {map.parent.industry}
        </p>
      </div>

      <div
        className="regions-grid grid gap-4 min-w-0"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}
      >
        {regionsWithEntities.map(region => (
          <div key={region} className="region-column space-y-3 min-w-0">
            <div className="region-header text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              {REGION_LABELS[region]}
            </div>
            {(grouped.get(region) ?? []).map(entity => (
              <EntityCardCompact key={entity.id} entity={entity} />
            ))}
          </div>
        ))}
      </div>

      {map.unmappedEntities.length > 0 && (
        <div className="unmapped-footer text-sm text-muted-foreground border-t border-border pt-4">
          Plus {map.unmappedEntities.length} other {map.unmappedEntities.length === 1 ? "entity" : "entities"} not mapped:{" "}
          {map.unmappedEntities.join(", ")}
        </div>
      )}
    </div>
  );
}
