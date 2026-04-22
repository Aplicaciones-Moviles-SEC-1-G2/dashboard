import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartFrameProps {
  title: string;
  description?: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  aspect?: "wide" | "tall" | "square";
  className?: string;
  children?: React.ReactNode;
}

const ASPECT_CLASS: Record<Required<ChartFrameProps>["aspect"], string> = {
  wide: "aspect-[16/7]",
  tall: "aspect-[4/5]",
  square: "aspect-square",
};

export function ChartFrame({
  title,
  description,
  loading = false,
  empty = false,
  emptyMessage = "No data in the selected window.",
  aspect = "wide",
  className,
  children,
}: ChartFrameProps): React.JSX.Element {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("flex-1", ASPECT_CLASS[aspect])}>
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : empty ? (
          <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
