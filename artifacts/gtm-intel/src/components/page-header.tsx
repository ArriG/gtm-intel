import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  subtitleClassName?: string;
}

export function PageHeader({ title, subtitle, className, subtitleClassName }: PageHeaderProps) {
  return (
    <div className={className}>
      <h1 className="text-4xl font-bold tracking-tight leading-[1.15] text-[#2D3748]">{title}</h1>
      {subtitle && (
        <p className={cn("mt-2 text-base font-normal leading-relaxed text-[#5A677C]", subtitleClassName)}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
