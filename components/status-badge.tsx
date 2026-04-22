import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BqStatus } from "@/lib/types/bq";

const STATUS_STYLES: Record<BqStatus, string> = {
  GREEN: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  YELLOW: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
};

interface StatusBadgeProps {
  status: BqStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps): React.JSX.Element {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status], className)}>
      {status}
    </Badge>
  );
}
