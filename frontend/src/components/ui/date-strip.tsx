"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface DateStripItem {
  key: string;
  weekdayLabel: string;
  dayNumber: string | number;
  fullDateLabel?: string;
  isToday?: boolean;
  hasEvents?: boolean;
  disabled?: boolean;
}

export interface DateStripProps {
  items: DateStripItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function DateStrip({
  items,
  selectedKey,
  onSelect,
  ariaLabel = "Chọn ngày trong tuần",
  className,
}: DateStripProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    let nextIndex = -1;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % items.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    }

    if (nextIndex === -1) return;
    event.preventDefault();

    let attempts = 0;
    while (items[nextIndex]?.disabled && attempts < items.length) {
      nextIndex =
        event.key === "ArrowLeft" || event.key === "End"
          ? (nextIndex - 1 + items.length) % items.length
          : (nextIndex + 1) % items.length;
      attempts += 1;
    }

    const target = items[nextIndex];
    if (target && !target.disabled) {
      onSelect(target.key);
      buttonRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("grid grid-cols-7 gap-1 sm:gap-2", className)}
    >
      {items.map((item, index) => {
        const isSelected = item.key === selectedKey;
        const isToday = Boolean(item.isToday);

        return (
          <button
            key={item.key}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            disabled={item.disabled}
            aria-pressed={isSelected}
            aria-current={isToday ? "date" : undefined}
            aria-label={
              item.fullDateLabel ??
              `${item.weekdayLabel}, ngày ${item.dayNumber}${isToday ? ", hôm nay" : ""}`
            }
            onClick={() => onSelect(item.key)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={cn(
              "flex flex-col items-center justify-center min-h-[54px] md:min-h-[64px] py-1.5 md:py-2.5 px-1 rounded-full border gap-0.5 select-none",
              "transition-colors duration-[180ms] ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "bg-sage-background border-olive text-on-sage shadow-card-sm"
                : isToday
                  ? "bg-surface border-2 border-primary text-primary hover:bg-surface-subtle"
                  : "bg-surface border-border text-text-primary hover:bg-surface-subtle",
            )}
          >
            <span
              className={cn(
                "text-[11px] md:text-[12px] leading-[14px] md:leading-[16px] font-medium",
                isSelected
                  ? "text-on-sage"
                  : isToday
                    ? "text-primary"
                    : "text-text-secondary",
              )}
            >
              {item.weekdayLabel}
            </span>
            <span
              className={cn(
                "text-[14px] md:text-[16px] leading-[18px] md:leading-[22px] font-semibold tabular-nums",
                isSelected
                  ? "text-on-sage"
                  : isToday
                    ? "text-primary"
                    : "text-text-primary",
              )}
            >
              {item.dayNumber}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "w-1 h-1 md:w-1.5 md:h-1.5 rounded-full mt-0.5",
                item.hasEvents
                  ? isSelected
                    ? "bg-olive"
                    : isToday
                      ? "bg-primary"
                      : "bg-olive/80"
                  : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
