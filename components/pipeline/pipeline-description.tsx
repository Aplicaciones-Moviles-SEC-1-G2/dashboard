import * as React from "react";
import { ArrowRight, Cog, Database, LineChart } from "lucide-react";

export interface PipelineDescription {
  /** What Firestore reads happen — collections, filters, limits, indexes. */
  fetch: string;
  /** What the in-memory transform does after fetch — filters, buckets, aggregations. */
  process: string;
  /** What the UI renders on top of the transform output. */
  show: string;
}

interface PipelineDescriptionCardProps {
  description: PipelineDescription;
}

export function PipelineDescriptionCard({
  description,
}: PipelineDescriptionCardProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Section
        icon={<Database className="h-4 w-4 text-blue-500" aria-hidden />}
        heading="Fetch"
        body={description.fetch}
      />
      <Section
        icon={<Cog className="h-4 w-4 text-violet-500" aria-hidden />}
        heading="Process"
        body={description.process}
      />
      <Section
        icon={<LineChart className="h-4 w-4 text-emerald-500" aria-hidden />}
        heading="Show"
        body={description.show}
      />
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  heading: string;
  body: string;
}

function Section({ icon, heading, body }: SectionProps): React.JSX.Element {
  return (
    <div className="rounded-md border bg-card p-3 text-sm text-card-foreground">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {heading}
        </span>
        <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
