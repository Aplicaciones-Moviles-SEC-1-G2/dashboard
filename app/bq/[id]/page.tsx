import { notFound } from "next/navigation";
import type { Edge, Node } from "@xyflow/react";

import { BqHeader } from "@/components/bq-header";
import { ChartFrame } from "@/components/charts/chart-frame";
import { BQ01OccupancyLine } from "@/components/charts/bq-01/occupancy-line";
import { BQ01SaturationBar } from "@/components/charts/bq-01/saturation-bar";
import { BQ02GapHistogram } from "@/components/charts/bq-02/gap-histogram";
import { BQ03DurationHeatmap } from "@/components/charts/bq-03/duration-heatmap";
import { BQ04ConfidenceHistogram } from "@/components/charts/bq-04/confidence-histogram";
import { BQ05DomainBarList } from "@/components/charts/bq-05/domain-bar-list";
import { BQ06DailyOverstayStacked } from "@/components/charts/bq-06/daily-overstay-stacked";
import { BQ07ProbabilityGauge } from "@/components/charts/bq-07/probability-gauge";
import { BQ08ArrivalCurve } from "@/components/charts/bq-08/arrival-curve";
import { BQ09DemandHeatmap } from "@/components/charts/bq-09/demand-heatmap";
import { BQ09TopWindowsBarList } from "@/components/charts/bq-09/top-windows-bar-list";
import { BQ10SignedErrorLine } from "@/components/charts/bq-10/signed-error-line";
import { KpiStrip, type KpiEntry } from "@/components/kpi-strip";
import {
  bq01PipelineDescription,
  bq01PipelineEdges,
  bq01PipelineNodes,
} from "@/components/pipeline/bq-01";
import {
  bq02PipelineDescription,
  bq02PipelineEdges,
  bq02PipelineNodes,
} from "@/components/pipeline/bq-02";
import {
  bq03PipelineDescription,
  bq03PipelineEdges,
  bq03PipelineNodes,
} from "@/components/pipeline/bq-03";
import {
  bq04PipelineDescription,
  bq04PipelineEdges,
  bq04PipelineNodes,
} from "@/components/pipeline/bq-04";
import {
  bq05PipelineDescription,
  bq05PipelineEdges,
  bq05PipelineNodes,
} from "@/components/pipeline/bq-05";
import {
  bq06PipelineDescription,
  bq06PipelineEdges,
  bq06PipelineNodes,
} from "@/components/pipeline/bq-06";
import {
  bq07PipelineDescription,
  bq07PipelineEdges,
  bq07PipelineNodes,
} from "@/components/pipeline/bq-07";
import {
  bq08PipelineDescription,
  bq08PipelineEdges,
  bq08PipelineNodes,
} from "@/components/pipeline/bq-08";
import {
  bq09PipelineDescription,
  bq09PipelineEdges,
  bq09PipelineNodes,
} from "@/components/pipeline/bq-09";
import {
  bq10PipelineDescription,
  bq10PipelineEdges,
  bq10PipelineNodes,
} from "@/components/pipeline/bq-10";
import { PipelineDiagram } from "@/components/pipeline/pipeline-diagram-lazy";
import {
  PipelineDescriptionCard,
  type PipelineDescription,
} from "@/components/pipeline/pipeline-description";
import { QuestionStatementCard } from "@/components/question-statement-card";
import { loadBqPayload, type BqPayload } from "@/lib/actions";
import { findBq } from "@/lib/bq-registry";
import type { BqId } from "@/lib/types/bq";

interface BqPageParams {
  params: Promise<{ id: string }>;
}

// Force per-request rendering. Firestore composite indexes are deployed by
// the mobile team on their own cadence, so prerendering a page whose server
// action would hit `FAILED_PRECONDITION` must not fail the build.
// `unstable_cache` inside each Server Action still respects its own
// `revalidate` window.
export const dynamic = "force-dynamic";

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const { BQ_REGISTRY } = await import("@/lib/bq-registry");
  return BQ_REGISTRY.map((bq) => ({ id: bq.id }));
}

const OBSERVED_RANGE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatObservedMs(ms: number | null): string {
  return ms === null ? "—" : OBSERVED_RANGE_FORMATTER.format(new Date(ms));
}

function formatSecondsDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0s";
  if (sec < 60) return `${Math.round(sec)}s`;
  const minutes = Math.floor(sec / 60);
  const residual = Math.round(sec - minutes * 60);
  return residual === 0
    ? `${minutes}m`
    : `${minutes}m ${String(residual).padStart(2, "0")}s`;
}

function formatPercent(share: number, digits = 1): string {
  return `${(share * 100).toFixed(digits)}%`;
}

function pipelineFor(
  id: BqId,
): { nodes: Node[]; edges: Edge[]; description: PipelineDescription } {
  switch (id) {
    case "01":
      return {
        nodes: bq01PipelineNodes,
        edges: bq01PipelineEdges,
        description: bq01PipelineDescription,
      };
    case "02":
      return {
        nodes: bq02PipelineNodes,
        edges: bq02PipelineEdges,
        description: bq02PipelineDescription,
      };
    case "03":
      return {
        nodes: bq03PipelineNodes,
        edges: bq03PipelineEdges,
        description: bq03PipelineDescription,
      };
    case "04":
      return {
        nodes: bq04PipelineNodes,
        edges: bq04PipelineEdges,
        description: bq04PipelineDescription,
      };
    case "05":
      return {
        nodes: bq05PipelineNodes,
        edges: bq05PipelineEdges,
        description: bq05PipelineDescription,
      };
    case "06":
      return {
        nodes: bq06PipelineNodes,
        edges: bq06PipelineEdges,
        description: bq06PipelineDescription,
      };
    case "07":
      return {
        nodes: bq07PipelineNodes,
        edges: bq07PipelineEdges,
        description: bq07PipelineDescription,
      };
    case "08":
      return {
        nodes: bq08PipelineNodes,
        edges: bq08PipelineEdges,
        description: bq08PipelineDescription,
      };
    case "09":
      return {
        nodes: bq09PipelineNodes,
        edges: bq09PipelineEdges,
        description: bq09PipelineDescription,
      };
    case "10":
      return {
        nodes: bq10PipelineNodes,
        edges: bq10PipelineEdges,
        description: bq10PipelineDescription,
      };
  }
}

interface BqSectionContent {
  kpis: readonly KpiEntry[];
  visualization: React.ReactNode;
  /** Optional extra section rendered below the chart (e.g. queue placeholder). */
  extra?: React.ReactNode;
}

function buildBQ01Section(data: BqPayload & { id: "01" }): BqSectionContent {
  const hasData = data.data.sampleWindow.snapshotCount > 0;
  const peak = data.data.hourBuckets.reduce(
    (best, b) => (b.meanOccupancyPct > best.meanOccupancyPct ? b : best),
    data.data.hourBuckets[0] ?? {
      hour: 0,
      meanOccupancyPct: 0,
      maxOccupancyPct: 0,
      saturationMinutes: 0,
      sampleCount: 0,
    },
  );
  const longest =
    data.data.saturationEvents.length > 0
      ? Math.max(0, ...data.data.saturationEvents.map((e) => e.durationMinutes))
      : 0;
  const kpis: KpiEntry[] = [
    {
      label: "Capacity",
      value:
        data.data.capacity == null ? null : `${data.data.capacity} spots`,
    },
    {
      label: "Peak hour",
      value: `${String(peak.hour).padStart(2, "0")}:00 · ${peak.meanOccupancyPct.toFixed(1)}%`,
    },
    {
      label: "Saturation events (14d)",
      value: data.data.saturationEvents.length,
    },
    {
      label: "Longest run",
      value: longest === 0 ? null : `${longest.toFixed(0)} min`,
    },
  ];
  const visualization = hasData ? (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartFrame title="Mean occupancy by local hour" aspect="wide">
        <BQ01OccupancyLine hourBuckets={data.data.hourBuckets} />
      </ChartFrame>
      <ChartFrame title="Mean saturation duration by local hour" aspect="wide">
        <BQ01SaturationBar hourBuckets={data.data.hourBuckets} />
      </ChartFrame>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartFrame
        title="Mean occupancy by local hour"
        empty
        emptyMessage="No snapshots in the selected window."
      />
      <ChartFrame
        title="Mean saturation duration by local hour"
        empty
        emptyMessage="No saturation observed in this window."
      />
    </div>
  );
  return { kpis, visualization };
}

function buildBQ02Section(data: BqPayload & { id: "02" }): BqSectionContent {
  const hasData =
    data.data.observed.snapshotCount > 0 && data.data.observed.deltaCount > 0;
  const percentOfGaps =
    data.data.observed.deltaCount > 0
      ? (data.data.stalls.gapsAboveThreshold / data.data.observed.deltaCount) *
        100
      : 0;
  const description = `Observed range ${formatObservedMs(data.data.observed.earliestMs)}–${formatObservedMs(data.data.observed.latestMs)}`;
  const kpis: KpiEntry[] = [
    { label: "p50 gap", value: formatSecondsDuration(data.data.percentiles.p50Sec) },
    { label: "p95 gap", value: formatSecondsDuration(data.data.percentiles.p95Sec) },
    { label: "p99 gap", value: formatSecondsDuration(data.data.percentiles.p99Sec) },
    {
      label: "% gaps > 3× median",
      value:
        data.data.observed.deltaCount > 0
          ? `${percentOfGaps.toFixed(1)}%`
          : null,
    },
    { label: "Stall periods", value: data.data.stalls.distinctStallPeriods },
  ];
  const visualization = hasData ? (
    <ChartFrame
      title="Inter-snapshot gap distribution"
      description={description}
      aspect="wide"
    >
      <BQ02GapHistogram histogram={data.data.histogram} />
    </ChartFrame>
  ) : (
    <ChartFrame
      title="Inter-snapshot gap distribution"
      description={description}
      empty
      emptyMessage="No snapshots in the selected window."
    />
  );
  return { kpis, visualization };
}

function buildBQ03Section(data: BqPayload & { id: "03" }): BqSectionContent {
  const hasData = data.data.cohort.exitCount > 0;
  const totalFetched =
    data.data.cohort.exitCount +
    data.data.drops.unregisteredPlateCount +
    data.data.drops.nullDurationCount;
  const description = `${data.data.cohort.registeredPlateCount} registered plates · ${data.data.cohort.exitCount} exits bucketed (America/Bogota)`;
  const kpis: KpiEntry[] = [
    {
      label: "Registered-cohort mean stay",
      value:
        data.data.cohort.overallMeanDurationHours === null
          ? null
          : `${data.data.cohort.overallMeanDurationHours.toFixed(2)} h`,
    },
    {
      label: "Exits analyzed",
      value: data.data.cohort.exitCount,
      caption: `of ${totalFetched} exits fetched`,
    },
    {
      label: "Drops",
      value: `${data.data.drops.unregisteredPlateCount} unregistered · ${data.data.drops.nullDurationCount} null-duration`,
    },
  ];
  const visualization = hasData ? (
    <ChartFrame
      title="Registered-user mean stay by (day, hour)"
      description={description}
      aspect="wide"
    >
      <BQ03DurationHeatmap
        cells={data.data.cells}
        colorAnchorHours={data.data.cohort.overallMeanDurationHours}
      />
    </ChartFrame>
  ) : (
    <ChartFrame
      title="Registered-user mean stay by (day, hour)"
      description={description}
      empty
      emptyMessage="No registered exits in the selected window."
    />
  );
  return { kpis, visualization };
}

function buildBQ04Section(data: BqPayload & { id: "04" }): BqSectionContent {
  const hasData = data.data.totalEvents > 0;
  const range = data.data.observedRange;
  const rangeLabel =
    range === null
      ? "—"
      : `${range.minConfidence.toFixed(2)} – ${range.maxConfidence.toFixed(2)}`;
  const kpis: KpiEntry[] = [
    {
      label: "% below threshold",
      value: hasData ? formatPercent(data.data.belowThresholdShare) : null,
      caption: `${data.data.belowThresholdCount.toLocaleString()} / ${data.data.totalEvents.toLocaleString()} events`,
    },
    {
      label: "Configured threshold",
      value: data.data.threshold.toFixed(2),
    },
    {
      label: "Observed range",
      value: rangeLabel,
    },
  ];
  const visualization = hasData ? (
    <ChartFrame
      title="OCR confidence distribution with threshold overlay"
      description={`${data.data.totalEvents.toLocaleString()} events · ${data.data.anomalies.invalidCount} invalid rows dropped`}
      aspect="wide"
    >
      <BQ04ConfidenceHistogram
        bins={data.data.bins}
        threshold={data.data.threshold}
      />
    </ChartFrame>
  ) : (
    <ChartFrame
      title="OCR confidence distribution with threshold overlay"
      empty
      emptyMessage="No barrier events in the selected window."
    />
  );
  return { kpis, visualization };
}

function buildBQ05Section(data: BqPayload & { id: "05" }): BqSectionContent {
  const hasData = data.data.rows.length > 0;
  const { universityDomainKey, universityHoursShare } = data.data.kpis;
  const footnote = data.data.rows.some((r) => r.hasNullDuration)
    ? "* includes events whose durationHours was null."
    : null;
  const kpis: KpiEntry[] = [
    {
      label: "University-domain share",
      value:
        universityHoursShare === null
          ? null
          : formatPercent(universityHoursShare),
      caption: universityDomainKey,
    },
    {
      label: "Total registered hours",
      value: `${data.data.totals.totalRegisteredHours.toFixed(0)} h`,
      caption: `${data.data.totals.totalRegisteredEvents.toLocaleString()} events`,
    },
    {
      label: "Unknown-owner events",
      value: data.data.drops.unknownOwnerCount,
      caption: "excluded from KPI denominator",
    },
  ];
  const visualization = hasData ? (
    <ChartFrame
      title="Top parking-hours by email domain"
      description={`Top ${data.data.rows.length} domains by total hours`}
      aspect="wide"
    >
      <BQ05DomainBarList rows={data.data.rows} footnote={footnote} />
    </ChartFrame>
  ) : (
    <ChartFrame
      title="Top parking-hours by email domain"
      empty
      emptyMessage="No registered exits in the selected window."
    />
  );
  return { kpis, visualization };
}

function buildBQ06Section(data: BqPayload & { id: "06" }): BqSectionContent {
  const hasData = data.data.overall.totalExits > 0;
  const { envelope, overall, repeatOffenders } = data.data;
  const envelopeLabel = envelope.invalid
    ? "invalid"
    : `${String(envelope.openingHour).padStart(2, "0")}:00–${String(envelope.closingHour).padStart(2, "0")}:00`;
  const kpis: KpiEntry[] = [
    {
      label: "% sessions overstay",
      value: hasData ? formatPercent(overall.overstayShare) : null,
      caption: `${overall.totalOverstays.toLocaleString()} / ${overall.totalExits.toLocaleString()} exits`,
    },
    {
      label: "Repeat-offender share (registered)",
      value:
        repeatOffenders.repeatOffenderShare === null
          ? null
          : formatPercent(repeatOffenders.repeatOffenderShare),
      caption: `${repeatOffenders.registeredOverstaysTotal} registered overstays`,
    },
    {
      label: "Operating envelope",
      value: envelopeLabel,
      caption: "Bogota",
    },
  ];
  const visualization = hasData ? (
    <ChartFrame
      title="Daily overstays (last 30 days)"
      description="stacked by registered vs unregistered"
      aspect="wide"
    >
      <BQ06DailyOverstayStacked dailyBuckets={data.data.dailyBuckets} />
    </ChartFrame>
  ) : (
    <ChartFrame
      title="Daily overstays (last 30 days)"
      empty
      emptyMessage="No exits recorded in the selected window."
    />
  );
  return { kpis, visualization };
}

function buildBQ07Section(data: BqPayload & { id: "07" }): BqSectionContent {
  const kpis: KpiEntry[] = [
    {
      label: "P(spot in 10 min)",
      value: formatPercent(data.data.proxyProbability, 0),
      caption: `tier ${data.data.tier}`,
    },
    {
      label: "Free spots right now",
      value: `${data.data.freeSpotsNow} / ${data.data.capacity}`,
      caption: data.data.disclaimers.liveStateEmpty
        ? "live state unverified (OQ-PS-2)"
        : undefined,
    },
  ];
  const visualization = (
    <ChartFrame
      title="Probability of finding a spot in 10 min"
      description={data.data.disclaimers.bucketMissing
        ? "historical bucket missing — falling back to live share"
        : `bucket ${data.data.bucket.id} · sample ${data.data.bucket.sampleSize}`}
      aspect="square"
    >
      <BQ07ProbabilityGauge data={data.data} />
    </ChartFrame>
  );
  return { kpis, visualization };
}

function buildBQ08Section(data: BqPayload & { id: "08" }): BqSectionContent {
  const hasData = data.data.buckets.length > 0;
  const bandLabel =
    data.data.recommendationBand === null
      ? "— (no bucket meets threshold)"
      : `${data.data.recommendationBand.startLabel}–${data.data.recommendationBand.endLabel}`;
  const kpis: KpiEntry[] = [
    {
      label: "Recommended window",
      value: bandLabel,
      caption:
        data.data.recommendationBand === null
          ? undefined
          : `min p=${formatPercent(data.data.recommendationBand.minPSpotsAvailable, 0)}`,
    },
    {
      label: "Peak p(spot)",
      value:
        data.data.peak === null
          ? null
          : `${formatPercent(data.data.peak.pSpotsAvailable, 0)} at ${data.data.peak.label}`,
    },
    {
      label: "Success threshold",
      value: formatPercent(data.data.threshold, 0),
      caption: "operator-adjustable",
    },
  ];
  const visualization = hasData ? (
    <ChartFrame
      title="Morning probability of finding a spot"
      description={`day-of-week ${data.data.dayOfWeek} · ${data.data.buckets.length}/${data.data.buckets.length + data.data.missingBuckets.length} buckets`}
      aspect="wide"
    >
      <BQ08ArrivalCurve
        buckets={data.data.buckets}
        threshold={data.data.threshold}
        recommendationLabel={
          data.data.recommendationBand === null ? null : bandLabel
        }
      />
    </ChartFrame>
  ) : (
    <ChartFrame
      title="Morning probability of finding a spot"
      empty
      emptyMessage="Not enough history for this day yet."
    />
  );
  return { kpis, visualization };
}

function buildBQ09Section(data: BqPayload & { id: "09" }): BqSectionContent {
  const hasData = data.data.topWindows.length > 0 || data.data.peak !== null;
  const kpis: KpiEntry[] = [
    {
      label: "Peak demand window",
      value:
        data.data.peak === null
          ? null
          : `${data.data.peak.label} · ${data.data.peak.avgOccupancyPct.toFixed(1)}%`,
    },
    {
      label: "Top utilization score",
      value:
        data.data.topWindows[0]?.utilizationScore.toFixed(2) ?? null,
      caption: data.data.topWindows[0]?.label,
    },
    {
      label: "Missing cells",
      value: data.data.missingCells.length,
      caption: "of 168",
    },
  ];
  const visualization = hasData ? (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartFrame
        title={`${data.data.facilityName} demand heatmap (day × hour)`}
        aspect="wide"
      >
        <BQ09DemandHeatmap
          cells={data.data.cells}
          missingCells={data.data.missingCells}
        />
      </ChartFrame>
      <ChartFrame title="Top utilization windows" aspect="wide">
        <BQ09TopWindowsBarList topWindows={data.data.topWindows} />
      </ChartFrame>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartFrame
        title={`${data.data.facilityName} demand heatmap (day × hour)`}
        empty
        emptyMessage={`No rollup data available for facility '${data.data.facilityId}'.`}
      />
      <ChartFrame
        title="Top utilization windows"
        empty
        emptyMessage="No utilization data yet."
      />
    </div>
  );
  return { kpis, visualization };
}

function buildBQ10Section(data: BqPayload & { id: "10" }): BqSectionContent {
  const hasData = data.data.points.length > 0;
  const kpis: KpiEntry[] = [
    {
      label: "Mean absolute error",
      value: hasData ? `${data.data.summary.mae.toFixed(2)} spots` : null,
    },
    {
      label: "Max abs error",
      value: hasData
        ? `${data.data.summary.maxAbsError.toFixed(0)} spots`
        : null,
    },
    {
      label: `% within ±${data.data.window.toleranceSpots} spots`,
      value: hasData
        ? formatPercent(data.data.summary.withinToleranceShare)
        : null,
    },
    {
      label: "Longest drift streak",
      value: hasData
        ? `${data.data.summary.longestDriftStreakMinutes.toFixed(0)} min`
        : null,
    },
  ];
  const visualization = hasData ? (
    <ChartFrame
      title="Signed error over time (availability)"
      description={`${data.data.points.length.toLocaleString()} drift points · tolerance ±${data.data.window.toleranceSpots}`}
      aspect="wide"
    >
      <BQ10SignedErrorLine
        points={data.data.points}
        toleranceSpots={data.data.window.toleranceSpots}
      />
    </ChartFrame>
  ) : (
    <ChartFrame
      title="Signed error over time (availability)"
      empty
      emptyMessage="No drift data in the selected window."
    />
  );
  const extra = (
    <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">
        Queue accuracy — pending sensor data
      </p>
      <p className="mt-1">{data.data.queue.note}</p>
    </div>
  );
  return { kpis, visualization, extra };
}

function buildSection(payload: BqPayload): BqSectionContent {
  switch (payload.id) {
    case "01":
      return buildBQ01Section(payload);
    case "02":
      return buildBQ02Section(payload);
    case "03":
      return buildBQ03Section(payload);
    case "04":
      return buildBQ04Section(payload);
    case "05":
      return buildBQ05Section(payload);
    case "06":
      return buildBQ06Section(payload);
    case "07":
      return buildBQ07Section(payload);
    case "08":
      return buildBQ08Section(payload);
    case "09":
      return buildBQ09Section(payload);
    case "10":
      return buildBQ10Section(payload);
  }
}

export default async function BqPage({
  params,
}: BqPageParams): Promise<React.JSX.Element> {
  const { id } = await params;
  const bq = findBq(id);
  if (!bq) {
    notFound();
  }

  const payload = await loadBqPayload(bq.id);
  const section = buildSection(payload);
  const {
    nodes: pipelineNodes,
    edges: pipelineEdges,
    description: pipelineDescription,
  } = pipelineFor(bq.id);

  return (
    <div className="flex flex-col gap-8">
      <BqHeader bq={bq} />

      <QuestionStatementCard question={bq.question} />

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Key indicators
        </h2>
        <KpiStrip kpis={section.kpis} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Visualization
        </h2>
        {section.visualization}
        {section.extra}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pipeline
        </h2>
        <PipelineDiagram nodes={pipelineNodes} edges={pipelineEdges} />
        <PipelineDescriptionCard description={pipelineDescription} />
      </section>
    </div>
  );
}
