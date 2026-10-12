import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

// DESIGN_GUIDE §7, "Skeleton". Shaped like the page that is loading, never a lone spinner.
export function PageHeaderSkeleton() {
  return (
    <div aria-hidden className="mb-6 rounded-panel border-2 border-line bg-surface px-[22px] pt-[22px] pb-5 shadow-pop">
      <Skeleton className="mb-3 h-3 w-40" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-3.5 w-64 max-w-full" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden className="grid gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Panel key={index} className="flex h-[76px] items-center gap-4 p-4">
          <Skeleton className="h-full w-1.5 rounded-sm" />
          <div className="grid flex-1 gap-2.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </Panel>
      ))}
    </div>
  );
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      <PageHeaderSkeleton />
      <ListSkeleton rows={rows} />
    </>
  );
}

export function FormSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <Panel aria-hidden className="grid gap-[18px] p-6 min-[640px]:grid-cols-2">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </Panel>
    </>
  );
}
