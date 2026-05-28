import { Button } from "@/components/ui/button";
import { BriefCard, BriefCardContent } from "@/components/brief-card";

export function SingleEntityFallback({ onSwitchToBrief }: { onSwitchToBrief: () => void }) {
  return (
    <BriefCard className="border-dashed">
      <BriefCardContent className="py-10 text-center space-y-4 max-w-lg mx-auto">
        <h2 className="text-lg font-semibold">Single-entity company</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This company does not appear to have major geographic divisions or sub-entities. Switch to Brief mode for a standard brief on the company.
        </p>
        <Button className="rounded-xl" onClick={onSwitchToBrief}>
          Switch to Brief mode
        </Button>
      </BriefCardContent>
    </BriefCard>
  );
}
