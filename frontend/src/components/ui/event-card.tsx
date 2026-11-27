import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge, type BadgeVariant } from "./badge";
import { Button } from "./button";
import {
  ChevronRightIcon,
  ClockIcon,
  VideoIcon,
} from "./icons";

export type EventCategory = "session" | "coaching" | "officehour" | "duty" | "meeting" | "deadline";

export type EventCardVariant = "featured" | "timeline" | "compact";

export interface EventCardProps {
  title: string;
  category: EventCategory;
  categoryLabel?: string;
  timeRange: string;
  startTime?: string;
  formatLabel?: string;
  sources?: string[];
  variant?: EventCardVariant;
  featuredLabel?: string;
  changeNote?: string;
  showTimelineRail?: boolean;
  isLastInTimeline?: boolean;
  ctaLabel?: string;
  onCtaClick?: () => void;
  onSelect?: () => void;
  rightBadge?: ReactNode;
  className?: string;
}

const categoryBadgeConfig: Record<
  EventCategory,
  { label: string; variant: BadgeVariant }
> = {
  session: { label: "Buổi học", variant: "secondary" },
  coaching: { label: "Workshop", variant: "primary" },
  officehour: { label: "Hỗ trợ / Lab", variant: "info" },
  duty: { label: "Mentor duty", variant: "info" },
  meeting: { label: "Họp nhóm", variant: "primary" },
  deadline: { label: "Hạn nộp", variant: "warning" },
};

export function EventCard({
  title,
  category,
  categoryLabel,
  timeRange,
  startTime,
  formatLabel,
  sources = [],
  variant = "timeline",
  featuredLabel = "Buổi học tiếp theo",
  changeNote,
  showTimelineRail = false,
  isLastInTimeline = false,
  ctaLabel,
  onCtaClick,
  onSelect,
  rightBadge,
  className,
}: EventCardProps) {
  const catConfig = categoryBadgeConfig[category];
  const resolvedCategoryLabel = categoryLabel ?? catConfig.label;
  const isHighlighted = Boolean(changeNote);

  if (variant === "featured") {
    return (
      <article
        className={cn(
          "bg-surface border border-border rounded-[20px] md:rounded-[24px] p-4 md:p-6 shadow-card flex flex-col gap-3 md:gap-4",
          isHighlighted && "border-secondary/45",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-2.5 md:gap-3">
          <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
            <span className="text-[12px] md:text-[13px] leading-[16px] md:leading-[18px] font-medium text-secondary">
              {featuredLabel}
            </span>
            <h3 className="text-[16px] leading-[22px] md:text-[18px] md:leading-[26px] font-semibold tracking-[-0.1px] text-text-primary text-balance">
              {title}
            </h3>
          </div>
          {rightBadge ??
            (formatLabel ? (
              <Badge variant="secondary">{formatLabel}</Badge>
            ) : (
              <Badge variant={catConfig.variant}>{resolvedCategoryLabel}</Badge>
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <span className="inline-flex items-center gap-1.5 text-[13px] leading-[18px] md:text-[15px] md:leading-[22px] text-text-primary tabular-nums">
            <ClockIcon size={16} className="text-secondary shrink-0 md:w-[18px] md:h-[18px]" />
            <span>{timeRange}</span>
          </span>
          {sources.length > 0 ? (
            <Badge variant="neutral">{sources.join(" + ")}</Badge>
          ) : null}
          {changeNote ? <Badge variant="warning">{changeNote}</Badge> : null}
        </div>

        {ctaLabel ? (
          <div className="flex items-center gap-2 pt-0.5">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<VideoIcon size={18} />}
              onClick={onCtaClick ?? onSelect}
            >
              {ctaLabel}
            </Button>
          </div>
        ) : null}
      </article>
    );
  }

  const cardBody = (
    <div className="flex flex-col gap-1.5 md:gap-2 w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 md:gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={catConfig.variant}>{resolvedCategoryLabel}</Badge>
            {changeNote ? <Badge variant="warning">{changeNote}</Badge> : null}
          </div>
          <h3 className="text-[14px] leading-[20px] md:text-[16px] md:leading-[24px] font-semibold text-text-primary text-pretty">
            {title}
          </h3>
        </div>

        {onSelect ? (
          <ChevronRightIcon
            size={18}
            className="text-text-secondary shrink-0 mt-0.5 transition-transform duration-[180ms] group-hover:translate-x-0.5 md:w-5 md:h-5"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-[12px] leading-[18px] md:text-[13px] md:leading-[20px] text-text-secondary">
        <span className="tabular-nums">
          {timeRange}
          {formatLabel ? ` · ${formatLabel}` : ""}
        </span>
        {sources.length > 0 ? (
          <Badge variant="neutral" size="sm">
            {sources.join(" + ")}
          </Badge>
        ) : null}
      </div>
    </div>
  );

  const cardSurfaceClasses = cn(
    "group flex-1 bg-surface border rounded-[16px] md:rounded-[20px] p-3 md:p-4 shadow-card-sm text-left",
    "transition-colors duration-[180ms] ease-out",
    isHighlighted ? "border-secondary/45" : "border-border",
    onSelect &&
      "cursor-pointer hover:border-secondary/50 hover:bg-surface-subtle/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    !showTimelineRail && className,
  );

  const cardElement = onSelect ? (
    <button type="button" onClick={onSelect} className={cardSurfaceClasses}>
      {cardBody}
    </button>
  ) : (
    <article className={cardSurfaceClasses}>{cardBody}</article>
  );

  if (!showTimelineRail || variant === "compact") {
    return cardElement;
  }

  return (
    <div className={cn("flex items-stretch gap-2.5 md:gap-3", className)}>
      <div className="flex flex-col items-center w-12 md:w-14 shrink-0 pt-1">
        <span
          className={cn(
            "px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[11px] md:text-[12px] leading-[15px] md:leading-[16px] font-medium tabular-nums border",
            changeNote
              ? "bg-warning-background text-on-warning border-primary/20"
              : "bg-surface text-text-secondary border-border",
          )}
        >
          {startTime ?? timeRange.split("–")[0]?.trim()}
        </span>
        {!isLastInTimeline ? (
          <div aria-hidden="true" className="w-px flex-1 bg-border mt-1.5" />
        ) : null}
      </div>
      {cardElement}
    </div>
  );
}
