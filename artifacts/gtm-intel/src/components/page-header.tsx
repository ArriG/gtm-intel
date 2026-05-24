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
      <h1 className="text-4xl font-extrabold tracking-tight leading-[1.1] text-foreground">{title}</h1>
      {subtitle && (
        <p className={cn("mt-2 text-base font-medium leading-relaxed text-muted-foreground", subtitleClassName)}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
