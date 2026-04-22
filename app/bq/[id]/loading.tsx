import { Skeleton } from "@/components/ui/skeleton";

export default function BqLoading(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="aspect-[16/7] w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
