import type { AccountMapResponse } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { BriefCard, BriefCardContent } from "@/components/brief-card";

export function ParentSummaryCard({ parent, sectorPackUsed }: Pick<AccountMapResponse, "parent" | "sectorPackUsed">) {
  return (
    <BriefCard>
      <BriefCardContent className="pt-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{parent.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {parent.headquartersCountry} · {parent.industry}
            </p>
          </div>
          <Badge variant="outline" className="text-[11px] shrink-0">
            Sourced from: {sectorPackUsed.replace(/-/g, " ")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{parent.description}</p>
      </BriefCardContent>
    </BriefCard>
  );
}
