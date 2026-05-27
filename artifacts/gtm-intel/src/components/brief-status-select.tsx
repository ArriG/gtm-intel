import { useState } from "react";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BRIEF_STATUS_LABELS,
  BRIEF_STATUS_VALUES,
  type BriefStatus,
} from "@/lib/brief-status";

export function BriefStatusSelect({
  status,
  onStatusChange,
  disabled,
}: {
  status: BriefStatus;
  onStatusChange: (status: BriefStatus) => void;
  disabled?: boolean;
}) {
  const [savedFlash, setSavedFlash] = useState(false);

  function handleChange(value: string) {
    const next = value as BriefStatus;
    onStatusChange(next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="brief-status" className="text-xs font-medium text-muted-foreground sr-only">
        Brief status
      </Label>
      <Select value={status} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger id="brief-status" className="h-8 w-[180px] text-xs rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BRIEF_STATUS_VALUES.map(value => (
            <SelectItem key={value} value={value} className="text-xs">
              {BRIEF_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {savedFlash && (
        <span className="text-xs text-primary flex items-center gap-1">
          <Check className="w-3 h-3" />
          Saved
        </span>
      )}
    </div>
  );
}
