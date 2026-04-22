import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { BqPreview } from "@/components/bq-preview";
import { TypeBadge } from "@/components/type-badge";
import { cn } from "@/lib/utils";
import type { BqPayload } from "@/lib/actions";
import type { BqMetadata, BqTypeSection } from "@/lib/types/bq";

export type BqCardTone = "hero" | "feature" | "compact";

interface BqCardProps {
  bq: BqMetadata;
  payload: BqPayload;
  tone?: BqCardTone;
  className?: string;
}

/** Radial-gradient accent tuned per type section. Layered under a subtle
 * tint so the background reads as "this tile belongs to Type N" without
 * overwhelming the chart. */
const TYPE_ACCENT: Record<BqTypeSection, string> = {
  1: "before:bg-[radial-gradient(circle_at_100%_0%,hsl(215_25%_55%/0.22),transparent_55%)]",
  2: "before:bg-[radial-gradient(circle_at_100%_0%,hsl(217_92%_60%/0.22),transparent_55%)]",
  3: "before:bg-[radial-gradient(circle_at_100%_0%,hsl(262_83%_62%/0.22),transparent_55%)]",
  4: "before:bg-[radial-gradient(circle_at_100%_0%,hsl(38_92%_55%/0.22),transparent_55%)]",
  5: "before:bg-[radial-gradient(circle_at_100%_0%,hsl(152_72%_45%/0.22),transparent_55%)]",
};

const TYPE_RING: Record<BqTypeSection, string> = {
  1: "group-hover:ring-slate-400/50",
  2: "group-hover:ring-blue-400/50",
  3: "group-hover:ring-violet-400/50",
  4: "group-hover:ring-amber-400/50",
  5: "group-hover:ring-emerald-400/50",
};

// Chart containers are flex-1 inside a column-flex article, so they must
// express size as `min-h-*` rather than a fixed `h-*`. A fixed height
// prevents flex-grow from consuming the extra row-span on the hero tile
// and leaves a visible gap beneath the chart.
const TONE_LAYOUT: Record<BqCardTone, { padding: string; titleClass: string; chartClass: string; showQuestion: boolean }> = {
  hero: {
    padding: "p-6",
    titleClass: "text-xl font-semibold",
    chartClass: "min-h-[10rem] md:min-h-[14rem]",
    showQuestion: true,
  },
  feature: {
    padding: "p-5",
    titleClass: "text-lg font-semibold",
    chartClass: "min-h-[8rem] md:min-h-[10rem]",
    showQuestion: true,
  },
  compact: {
    padding: "p-4",
    titleClass: "text-sm font-semibold",
    chartClass: "min-h-[5rem] md:min-h-[6rem]",
    showQuestion: false,
  },
};

export function BqCard({
  bq,
  payload,
  tone = "compact",
  className,
}: BqCardProps): React.JSX.Element {
  const layout = TONE_LAYOUT[tone];
  return (
    <Link
      href={bq.route}
      className={cn(
        "group relative block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm ring-1 ring-transparent transition",
          "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity group-hover:before:opacity-100",
          "group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-2",
          TYPE_ACCENT[bq.typeSection],
          TYPE_RING[bq.typeSection],
          layout.padding,
        )}
      >
        <header className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border bg-background px-2 text-xs font-semibold tabular-nums text-muted-foreground">
                {bq.displayNumber}
              </span>
              <TypeBadge type={bq.typeSection} className="text-[10px]" />
            </div>
            <h3 className={cn("leading-tight tracking-tight", layout.titleClass)}>
              {bq.shortTitle}
            </h3>
          </div>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </header>

        <div
          className={cn(
            "relative z-10 mt-4 flex w-full flex-1 min-h-0 overflow-hidden rounded-xl border bg-background/60 p-2",
            layout.chartClass,
          )}
        >
          <BqPreview payload={payload} />
        </div>

        {layout.showQuestion ? (
          <p className="relative z-10 mt-3 line-clamp-2 text-xs text-muted-foreground">
            {bq.question}
          </p>
        ) : null}
      </article>
    </Link>
  );
}
