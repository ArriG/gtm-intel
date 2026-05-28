import type { AccountMapResponse } from "@workspace/api-client-react";
import { EntityCardCompact } from "./entity-card-compact";
import { groupEntitiesByRegion, REGION_LABELS, REGION_ORDER } from "@/lib/account-map-labels";

export function AccountMapDiagram({ map }: { map: AccountMapResponse }) {
  const grouped = groupEntitiesByRegion(map.entities);
  const regionsWithEntities = REGION_ORDER.filter(region => (grouped.get(region)?.length ?? 0) > 0);

  return (
    <div className="map-diagram space-y-8 min-w-0">
      <div className="parent-header text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight break-words">{map.parent.name}</h2>
        <p className="text-sm text-muted-foreground">
          {map.parent.headquartersCountry} · {map.parent.industry}
        </p>
      </div>

      {regionsWithEntities.map(region => (
        <section key={region} className="space-y-3 min-w-0">
          <div className="region-header text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            {REGION_LABELS[region]}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-w-0">
            {(grouped.get(region) ?? []).map(entity => (
              <EntityCardCompact key={entity.id} entity={entity} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
