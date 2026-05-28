import { useMemo, useState } from "react";
import type { AccountMapResponse, MapEntity } from "@workspace/api-client-react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BriefCard, BriefCardContent } from "@/components/brief-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AUTONOMY_LABELS,
  FIT_TIER_CLASS,
  FIT_TIER_LABELS,
  RELATIONSHIP_LABELS,
  REGION_LABELS,
  REGION_ORDER,
  groupEntitiesByRegion,
} from "@/lib/account-map-labels";
import { cn } from "@/lib/utils";

function EntityDetailCard({
  entity,
  expanded,
  onOpenChange,
}: {
  entity: MapEntity;
  expanded: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Collapsible open={expanded} onOpenChange={onOpenChange}>
      <BriefCard className={cn(entity.fitTier === "skip" && "opacity-70")}>
        <CollapsibleTrigger className="w-full text-left">
          <BriefCardContent className="pt-4 pb-4 flex items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-sm">{entity.name}</h3>
                <Badge className={cn("text-[10px] border", FIT_TIER_CLASS[entity.fitTier])}>
                  {FIT_TIER_LABELS[entity.fitTier]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {entity.country} · {entity.businessLine} · {RELATIONSHIP_LABELS[entity.parentRelationship]}
              </p>
              <p className="text-xs text-muted-foreground">
                {entity.buyers.length} {entity.buyers.length === 1 ? "buyer" : "buyers"} identified
              </p>
            </div>
            <ChevronDown className={cn("w-4 h-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
          </BriefCardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <BriefCardContent className="pt-0 pb-5 space-y-4 border-t border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">{entity.context}</p>
            <p className="text-sm">
              <span className="font-medium text-foreground">Buying autonomy: </span>
              <span className="text-muted-foreground">{AUTONOMY_LABELS[entity.buyingAutonomy]}</span>
            </p>
            <p className="text-sm text-muted-foreground">{entity.fitReason}</p>

            {entity.buyers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buyers</p>
                <ul className="space-y-2">
                  {entity.buyers.map(buyer => (
                    <li key={`${buyer.name}-${buyer.role}`} className="text-sm">
                      <span className="font-medium">{buyer.name}</span>
                      <span className="text-muted-foreground"> — {buyer.role}</span>
                      {buyer.tenureNote && (
                        <span className="text-muted-foreground"> ({buyer.tenureNote})</span>
                      )}
                      <div>
                        <a
                          href={buyer.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {buyer.sourceTitle}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {entity.sources.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border">
                <p className="text-[11px] font-medium text-muted-foreground">Sources</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {entity.sources.map(source => (
                    <a
                      key={source}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline break-all"
                    >
                      {source.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </BriefCardContent>
        </CollapsibleContent>
      </BriefCard>
    </Collapsible>
  );
}

export function EntityDetailsSection({
  entities,
  expandedEntityId,
  onExpandedEntityIdChange,
}: {
  entities: MapEntity[];
  expandedEntityId: string | null;
  onExpandedEntityIdChange: (entityId: string | null) => void;
}) {
  const grouped = useMemo(() => groupEntitiesByRegion(entities), [entities]);
  const regionsWithEntities = REGION_ORDER.filter(region => (grouped.get(region)?.length ?? 0) > 0);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold tracking-tight">Entity details</h2>
      <div className="space-y-6">
        {regionsWithEntities.map(region => (
          <div key={region} className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {REGION_LABELS[region]}
            </p>
            {(grouped.get(region) ?? []).map(entity => (
              <div key={entity.id} id={`entity-${entity.id}`}>
                <EntityDetailCard
                  entity={entity}
                  expanded={expandedEntityId === entity.id}
                  onOpenChange={open => onExpandedEntityIdChange(open ? entity.id : null)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
