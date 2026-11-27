import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}

const roundedClasses: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded-[8px]",
  md: "rounded-[16px]",
  lg: "rounded-[20px]",
  xl: "rounded-[24px]",
  full: "rounded-full",
};

export function Skeleton({
  rounded = "full",
  className,
  ...rest
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-border/75 animate-pulse motion-reduce:animate-none",
        roundedClasses[rounded],
        className,
      )}
      {...rest}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-surface border border-border rounded-[20px] p-4 shadow-card-sm flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

export function SourceCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-surface border border-border rounded-[24px] p-4 shadow-card-sm flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Skeleton rounded="md" className="w-11 h-11 shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 shrink-0" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-11 w-24" />
      </div>
    </div>
  );
}
