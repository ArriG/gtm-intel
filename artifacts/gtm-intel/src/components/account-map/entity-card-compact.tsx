import { useState } from "react";
import type { MapEntity } from "@workspace/api-client-react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BriefCard, BriefCardContent } from "@/components/brief-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AUTONOMY_LABELS,
  FIT_TIER_CLASS,
  FIT_TIER_LABELS,
  verifiedLeaders,
} from "@/lib/account-map-labels";
import { cn } from "@/lib/utils";

export function EntityCardCompact({ entity }: { entity: MapEntity }) {
  const [open, setOpen] = useState(false);
  const leaders = verifiedLeaders(entity.buyers);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <BriefCard className={cn("w-full min-w-0 overflow-hidden", entity.fitTier === "skip" && "opacity-80")}>
        <CollapsibleTrigger className="w-full text-left">
          <BriefCardContent className="pt-4 pb-4 relative">
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground absolute top-3 right-3 transition-transform",
                open && "rotate-180",
              )}
            />
            <div className="pr-7 space-y-2 min-w-0">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-snug break-words">{entity.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{entity.country}</p>
              </div>

              <p className="text-[10px] leading-snug text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5 break-words">
                {entity.businessLine}
              </p>

              {!open && leaders.length > 0 && (
                <ul className="text-xs text-foreground/90 space-y-1">
                  {leaders.slice(0, 2).map(leader => (
                    <li key={`${leader.name}-${leader.role}`} className="break-words">
                      <span className="text-muted-foreground">{leader.role}:</span> {leader.name}
                    </li>
                  ))}
                  {leaders.length > 2 && (
                    <li className="text-muted-foreground">+{leaders.length - 2} more</li>
                  )}
                </ul>
              )}

              {!open && leaders.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">
                  No named executives verified
                </p>
              )}

              <Badge className={cn("text-[10px] border", FIT_TIER_CLASS[entity.fitTier])}>
                {FIT_TIER_LABELS[entity.fitTier]}
              </Badge>
            </div>
          </BriefCardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <BriefCardContent className="pt-0 pb-4 space-y-3 border-t border-border min-w-0">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Leadership
              </p>
              {leaders.length > 0 ? (
                <ul className="space-y-2">
                  {leaders.map(leader => (
                    <li key={`${leader.name}-${leader.role}`} className="text-xs break-words">
                      <span className="font-medium text-foreground">{leader.name}</span>
                      <span className="text-muted-foreground"> — {leader.role}</span>
                      {leader.tenureNote && (
                        <span className="text-muted-foreground"> ({leader.tenureNote})</span>
                      )}
                      <div className="mt-0.5">
                        <a
                          href={leader.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1 text-[11px] text-primary hover:underline break-all"
                        >
                          {leader.sourceTitle}
                          <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No named executives verified from public sources for this entity.
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed break-words">{entity.context}</p>

            <p className="text-xs break-words">
              <span className="font-medium text-foreground">Buying autonomy: </span>
              <span className="text-muted-foreground">{AUTONOMY_LABELS[entity.buyingAutonomy]}</span>
            </p>

            <p className="text-xs text-muted-foreground break-words">{entity.fitReason}</p>

            {entity.sources.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border">
                <p className="text-[10px] font-medium text-muted-foreground">Sources</p>
                <div className="flex flex-col gap-1">
                  {entity.sources.map(source => (
                    <a
                      key={source}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline break-all"
                    >
                      {source.replace(/^https?:\/\/(www\.)?/, "")}
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
