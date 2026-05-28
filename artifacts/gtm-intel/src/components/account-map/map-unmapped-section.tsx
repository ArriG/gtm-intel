import type { AccountMapResponse } from "@workspace/api-client-react";
import { BriefCard, BriefCardContent } from "@/components/brief-card";

export function MapUnmappedSection({ map }: { map: AccountMapResponse }) {
  const shown = map.entities.length;
  const additional = map.unmappedEntities.length;
  const totalIdentified = shown + additional;

  if (additional === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Showing {shown} mapped {shown === 1 ? "entity" : "entities"} from this pass.
      </p>
    );
  }

  return (
    <BriefCard className="border-dashed bg-muted/15">
      <BriefCardContent className="pt-5 space-y-2">
        <p className="text-sm text-foreground">
          Showing <span className="font-semibold">{shown}</span> of{" "}
          <span className="font-semibold">{totalIdentified}</span> identified{" "}
          {totalIdentified === 1 ? "entity" : "entities"}.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">{additional} additional</span>{" "}
          {additional === 1 ? "entity was" : "entities were"} found in public sources but not expanded in this map
          (cap: 20 entities per run). Check the sources below before outreach.
        </p>
        <p className="text-xs text-muted-foreground break-words">
          {map.unmappedEntities.join(" · ")}
        </p>
      </BriefCardContent>
    </BriefCard>
  );
}
