import { BqCard, type BqCardTone } from "@/components/bq-card";
import { loadBqPayload, type BqPayload } from "@/lib/actions";
import { BQ_REGISTRY } from "@/lib/bq-registry";
import type { BqId } from "@/lib/types/bq";

// Render per-request so each tile reads its latest cached payload; individual
// `unstable_cache` wrappers still gate the Firestore cost.
export const dynamic = "force-dynamic";

interface MosaicTile {
  bq: (typeof BQ_REGISTRY)[number];
  payload: BqPayload;
  tone: BqCardTone;
  /** Tailwind classes that position the tile inside the mosaic grid. */
  span: string;
}

/** Tile prominence + position. Rows total 6 on desktop (two feature rows of
 * 3+3 sandwich two compact rows of 2+2+2) — deliberate asymmetry over a
 * uniform N-up grid. */
const TILE_LAYOUT: Record<BqId, { tone: BqCardTone; span: string }> = {
  "01": {
    tone: "hero",
    span: "md:col-span-2 lg:col-span-4 lg:row-span-2",
  },
  "02": {
    tone: "feature",
    span: "md:col-span-2 lg:col-span-2",
  },
  "03": {
    tone: "compact",
    span: "md:col-span-1 lg:col-span-2",
  },
  "04": {
    tone: "compact",
    span: "md:col-span-1 lg:col-span-2",
  },
  "05": {
    tone: "compact",
    span: "md:col-span-2 lg:col-span-2",
  },
  "06": {
    tone: "feature",
    span: "md:col-span-2 lg:col-span-3",
  },
  "07": {
    tone: "feature",
    span: "md:col-span-2 lg:col-span-3",
  },
  "08": {
    tone: "compact",
    span: "md:col-span-1 lg:col-span-2",
  },
  "09": {
    tone: "compact",
    span: "md:col-span-1 lg:col-span-2",
  },
  "10": {
    tone: "compact",
    span: "md:col-span-2 lg:col-span-2",
  },
};

export default async function OverviewPage(): Promise<React.JSX.Element> {
  const items = [...BQ_REGISTRY].sort((a, b) => a.displayNumber - b.displayNumber);
  const payloads = await Promise.all(items.map((bq) => loadBqPayload(bq.id)));
  const tiles: MosaicTile[] = items.map((bq, idx) => {
    const layout = TILE_LAYOUT[bq.id];
    return {
      bq,
      payload: payloads[idx]!,
      tone: layout.tone,
      span: layout.span,
    };
  });

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 items-center rounded-full border bg-background px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Overview
          </span>
          <span className="text-xs text-muted-foreground">
            {items.length} active business questions
          </span>
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">
          Parking operations dashboard
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Every tile below previews one business question. Larger tiles carry
          the flagship charts; the smaller tiles add the supporting signals.
          Click any tile to dive into its KPIs, pipeline diagram, and
          fetch/process/show narrative.
        </p>
      </header>

      <section
        className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-6 lg:gap-6 lg:auto-rows-[minmax(220px,auto)]"
        aria-label="Business question overview mosaic"
      >
        {tiles.map(({ bq, payload, tone, span }) => (
          <BqCard
            key={bq.id}
            bq={bq}
            payload={payload}
            tone={tone}
            className={span}
          />
        ))}
      </section>
    </div>
  );
}
