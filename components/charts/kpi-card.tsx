import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value?: string | number | null;
  caption?: string;
  loading?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  caption,
  loading = false,
  className,
}: KpiCardProps): React.JSX.Element {
  return (
    <Card className={cn("flex flex-col justify-between", className)}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {loading || value === undefined ? (
          <Skeleton className="h-8 w-20" />
        ) : value === null ? (
          <p className="text-2xl font-semibold text-muted-foreground">—</p>
        ) : (
          <p className="text-3xl font-semibold leading-tight">{value}</p>
        )}
        {caption ? (
          <p className="text-xs text-muted-foreground">{caption}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
