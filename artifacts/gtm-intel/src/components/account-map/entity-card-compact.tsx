import { useState } from "react";
import type { MapEntity } from "@workspace/api-client-react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { BriefCardContent } from "@/components/brief-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AUTONOMY_LABELS,
  FIT_TIER_LABELS,
  businessLineColorClass,
  verifiedLeaders,
} from "@/lib/account-map-labels";
import { cn } from "@/lib/utils";

export function EntityCardCompact({ entity }: { entity: MapEntity }) {
  const [open, setOpen] = useState(false);
  const leaders = verifiedLeaders(entity.buyers);
  const businessLine = entity.businessLine?.trim();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-2xl text-white",
          businessLineColorClass(businessLine),
          entity.fitTier === "skip" && "opacity-90",
        )}
      >
        <CollapsibleTrigger className="w-full text-left">
          <BriefCardContent className="pt-4 pb-4 relative">
            <ChevronDown
              className={cn(
                "w-4 h-4 text-white/70 absolute top-3 right-3 transition-transform",
                open && "rotate-180",
              )}
            />
            <div className="pr-7 space-y-2 min-w-0">
              {businessLine && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 break-words">
                  {businessLine}
                </p>
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-[0.95rem] leading-snug tracking-tight break-words text-white">
                  {entity.name}
                </h3>
                <p className="text-xs text-white/70 mt-0.5">{entity.country}</p>
              </div>

              {!open && leaders.length > 0 && (
                <ul className="text-xs text-white/90 space-y-1">
                  {leaders.slice(0, 2).map(leader => (
                    <li key={`${leader.name}-${leader.role}`} className="break-words">
                      <span className="text-white/70">{leader.role}:</span> {leader.name}
                    </li>
                  ))}
                  {leaders.length > 2 && (
                    <li className="text-white/70">+{leaders.length - 2} more</li>
                  )}
                </ul>
              )}

              {!open && leaders.length === 0 && (
                <p className="text-[11px] text-white/75 italic break-words">
                  {entity.leadershipNote || "No named executives verified \u2014 expand for sourcing notes"}
                </p>
              )}

              <span className="inline-flex items-center rounded-md bg-white/15 border border-white/25 px-2 py-0.5 text-[10px] font-semibold text-white">
                {FIT_TIER_LABELS[entity.fitTier]}
              </span>
            </div>
          </BriefCardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <BriefCardContent className="pt-0 pb-4 space-y-3 border-t border-white/20 min-w-0">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                Leadership
              </p>
              {leaders.length > 0 ? (
                <ul className="space-y-2">
                  {leaders.map(leader => (
                    <li key={`${leader.name}-${leader.role}`} className="text-xs break-words">
                      <span className="font-medium text-white">{leader.name}</span>
                      <span className="text-white/70"> — {leader.role}</span>
                      {leader.tenureNote && (
                        <span className="text-white/70"> ({leader.tenureNote})</span>
                      )}
                      <div className="mt-0.5">
                        <a
                          href={leader.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1 text-[11px] text-white/90 underline decoration-white/40 hover:decoration-white break-all"
                        >
                          {leader.sourceTitle}
                          <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/75 italic break-words">
                  No named executives verified from public sources for this entity.
                </p>
              )}
              {entity.leadershipNote && (
                <p className="text-[11px] text-white/85 bg-white/10 rounded-md px-2 py-1.5 leading-snug break-words">
                  <span className="font-medium text-white">Sourcing note: </span>
                  {entity.leadershipNote}
                </p>
              )}
            </div>

            <p className="text-xs text-white/85 leading-relaxed break-words">{entity.context}</p>

            <p className="text-xs break-words">
              <span className="font-medium text-white">Buying autonomy: </span>
              <span className="text-white/80">{AUTONOMY_LABELS[entity.buyingAutonomy]}</span>
            </p>

            <p className="text-xs text-white/80 break-words">{entity.fitReason}</p>

            {entity.sources.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-white/20">
                <p className="text-[10px] font-medium text-white/70">Sources</p>
                <div className="flex flex-col gap-1">
                  {entity.sources.map(source => (
                    <a
                      key={source}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-white/90 underline decoration-white/40 hover:decoration-white break-all"
                    >
                      {source.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </BriefCardContent>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
