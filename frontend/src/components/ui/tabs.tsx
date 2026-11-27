"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  content?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  ariaLabel?: string;
  variant?: "segmented" | "inline";
  className?: string;
  panelClassName?: string;
}

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  ariaLabel = "Chuyển chế độ hiển thị",
  variant = "segmented",
  className,
  panelClassName,
}: TabsProps) {
  const baseId = useId();
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items[0]?.value ?? "",
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeValue = value !== undefined ? value : internalValue;
  const activeItem = items.find((item) => item.value === activeValue) ?? items[0];

  function selectValue(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

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

    const nextItem = items[nextIndex];
    if (nextItem && !nextItem.disabled) {
      selectValue(nextItem.value);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "p-1 rounded-full bg-surface border border-border",
          variant === "segmented" ? "grid" : "inline-flex flex-wrap items-center gap-1 self-start",
        )}
        style={
          variant === "segmented"
            ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {items.map((item, index) => {
          const isSelected = item.value === activeValue;
          const tabId = `${baseId}-tab-${item.value}`;
          const panelId = `${baseId}-panel-${item.value}`;

          return (
            <button
              key={item.value}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={tabId}
              role="tab"
              type="button"
              disabled={item.disabled}
              aria-selected={isSelected}
              aria-controls={item.content !== undefined ? panelId : undefined}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => selectValue(item.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 min-h-[34px] md:min-h-[40px] px-3 md:px-4 rounded-full text-[12px] md:text-[13px] leading-[16px] md:leading-[18px] font-medium whitespace-nowrap",
                "transition-colors duration-[180ms] ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
                "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "bg-sage-background text-on-sage shadow-[0_1px_4px_rgba(23,23,25,0.06)]"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {item.icon ? (
                <span aria-hidden="true" className="inline-flex shrink-0">
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {activeItem?.content !== undefined ? (
        <div
          id={`${baseId}-panel-${activeItem.value}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${activeItem.value}`}
          tabIndex={0}
          className={cn(
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[20px]",
            panelClassName,
          )}
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
