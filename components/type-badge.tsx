import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BqTypeSection } from "@/lib/types/bq";

/**
 * Type 1..5 badge colours, chosen in `plans/10_dashboard_design_spec.md` §3.1.
 * Picks are chromatically distinct and Tremor/shadcn-compatible. If the
 * palette changes in the spec, edit here.
 */
const TYPE_STYLES: Record<BqTypeSection, string> = {
  1: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
  2: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  3: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
  4: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  5: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
};

interface TypeBadgeProps {
  type: BqTypeSection;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps): React.JSX.Element {
  return (
    <Badge variant="outline" className={cn("font-medium", TYPE_STYLES[type], className)}>
      Type {type}
    </Badge>
  );
}
