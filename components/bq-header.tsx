import { TypeBadge } from "@/components/type-badge";
import type { BqMetadata } from "@/lib/types/bq";

interface BqHeaderProps {
  bq: BqMetadata;
}

export function BqHeader({ bq }: BqHeaderProps): React.JSX.Element {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {bq.displayNumber}. {bq.shortTitle}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <TypeBadge type={bq.typeSection} />
      </div>
    </header>
  );
}
