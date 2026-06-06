import type { AccountMapResponse } from "@workspace/api-client-react";
import { BriefCard, BriefCardContent } from "@/components/brief-card";

export function LimitationsCard({ limitations }: Pick<AccountMapResponse, "limitations">) {
  return (
    <BriefCard className="border-dashed bg-muted/20">
      <BriefCardContent className="pt-5">
        <h3 className="text-sm font-semibold mb-2">Limitations</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{limitations}</p>
      </BriefCardContent>
    </BriefCard>
  );
}
