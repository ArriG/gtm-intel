import type { MapEntity } from "@workspace/api-client-react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BriefCard, BriefCardContent } from "@/components/brief-card";
import { FIT_TIER_CLASS, FIT_TIER_LABELS } from "@/lib/account-map-labels";
import { cn } from "@/lib/utils";

export function EntityCardCompact({
  entity,
  onExpand,
}: {
  entity: MapEntity;
  onExpand: (entityId: string) => void;
}) {
  return (
    <BriefCard className="w-full max-w-[280px]">
      <button
        type="button"
        onClick={() => onExpand(entity.id)}
        className="w-full text-left"
      >
        <BriefCardContent className="pt-4 pb-4 relative">
          <ChevronRight className="w-4 h-4 text-muted-foreground absolute top-3 right-3" />
          <div className="pr-6 space-y-2">
            <div>
              <h3 className="font-semibold text-sm leading-snug">{entity.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{entity.country}</p>
            </div>
            <Badge variant="outline" className="text-[10px] font-normal">
              {entity.businessLine}
            </Badge>
            {entity.buyers.length > 0 && (
              <ul className="text-xs text-foreground/90 space-y-1 pt-1">
                {entity.buyers.slice(0, 3).map(buyer => (
                  <li key={`${buyer.name}-${buyer.role}`}>
                    <span className="text-muted-foreground">{buyer.role}:</span> {buyer.name}
                  </li>
                ))}
              </ul>
            )}
            <Badge className={cn("text-[10px] border", FIT_TIER_CLASS[entity.fitTier])}>
              {FIT_TIER_LABELS[entity.fitTier]}
            </Badge>
          </div>
        </BriefCardContent>
      </button>
    </BriefCard>
  );
}
