import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAP_REGION_OPTIONS, type MapRegion } from "@/lib/map-region";

export function RegionSelect({
  region,
  onChange,
  disabled,
}: {
  region: MapRegion;
  onChange: (region: MapRegion) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-4 space-y-1.5">
      <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <MapPin className="w-4 h-4" />
        Region focus
      </span>
      <Select
        value={region}
        onValueChange={value => onChange(value as MapRegion)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px] bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MAP_REGION_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </div>
      <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
        One region per map — full detail and leadership search only here. Other regions appear as names only.
        For a global group, run a separate map per region (e.g. EMEA, then North America).
      </p>
    </div>
  );
}
