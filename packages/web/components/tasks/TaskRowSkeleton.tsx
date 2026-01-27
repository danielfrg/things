import { Skeleton } from '@/components/ui/skeleton';

export function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-4 md:px-2 py-2">
      {/* Checkbox circle */}
      <Skeleton className="h-5 w-5 rounded-full shrink-0" />
      {/* Title */}
      <Skeleton className="h-4 flex-1 max-w-[280px]" />
    </div>
  );
}

export function TaskListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      <TaskRowSkeleton />
      {count > 1 && <TaskRowSkeleton />}
      {count > 2 && <TaskRowSkeleton />}
      {count > 3 && <TaskRowSkeleton />}
      {count > 4 && <TaskRowSkeleton />}
    </div>
  );
}
