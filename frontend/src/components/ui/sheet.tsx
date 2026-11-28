"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";
import { XIcon } from "./icons";

export type SheetPlacement = "drawer" | "modal";
export type SheetSize = "sm" | "md" | "lg";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  headerBadge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  /** Desktop layout mode: right-side floating "drawer" or spacious centered "modal" */
  placement?: SheetPlacement;
  size?: SheetSize;
  className?: string;
}

const drawerWidthClasses: Record<SheetSize, string> = {
  sm: "md:w-[440px]",
  md: "md:w-[540px] lg:w-[580px]",
  lg: "md:w-[660px]",
};

const modalWidthClasses: Record<SheetSize, string> = {
  sm: "md:max-w-[500px]",
  md: "md:max-w-[640px]",
  lg: "md:max-w-[820px]",
};

export function Sheet({
  open,
  onOpenChange,
  title,
  subtitle,
  headerBadge,
  children,
  footer,
  closeLabel = "Đóng bảng chi tiết",
  placement = "drawer",
  size = "md",
  className,
}: SheetProps) {
  const titleId = useId();
  const subtitleId = useId();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      if (sheetRef.current && !sheetRef.current.contains(document.activeElement)) {
        const focusable = sheetRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        (focusable ?? sheetRef.current).focus();
      }
    }, 10);

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onOpenChangeRef.current(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const isDrawer = placement === "drawer";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-[#171719]/38 backdrop-blur-[6px] transition-opacity",
        isDrawer
          ? "md:items-stretch md:justify-end md:p-3"
          : "md:items-center md:justify-center md:p-6",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={cn(
          "w-full flex flex-col overflow-hidden bg-surface border-t md:border border-border/90",
          "max-h-[90dvh] rounded-t-[24px]",
          "shadow-[0_24px_60px_-12px_rgba(23,23,25,0.22),0_8px_24px_-6px_rgba(92,67,117,0.12)]",
          "focus:outline-none",
          isDrawer
            ? cn(
                "max-w-[500px] md:max-w-none md:h-[calc(100dvh-24px)] md:max-h-none md:rounded-[26px]",
                drawerWidthClasses[size],
                "animate-unify-drawer",
              )
            : cn(
                "max-w-[500px] md:max-h-[88dvh] md:rounded-[28px]",
                modalWidthClasses[size],
                "animate-unify-surface",
              ),
          className,
        )}
      >
        {/* Pinned Header */}
        <div className="shrink-0 bg-gradient-to-b from-[#FAF5FF]/75 to-surface border-b border-border/75 px-4 pt-2.5 pb-3.5 md:px-6 md:pt-5 md:pb-4 flex flex-col gap-2.5">
          <div
            aria-hidden="true"
            className="w-10 h-1 rounded-full bg-border mx-auto md:hidden"
          />

          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 md:gap-1.5 min-w-0">
              {headerBadge ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {headerBadge}
                </div>
              ) : null}
              <h2
                id={titleId}
                className="text-[17px] leading-[24px] md:text-[21px] md:leading-[28px] font-semibold tracking-[-0.2px] text-text-primary text-balance"
              >
                {title}
              </h2>
              {subtitle ? (
                <p
                  id={subtitleId}
                  className="text-[12px] leading-[18px] md:text-[13px] md:leading-[19px] text-text-secondary"
                >
                  {subtitle}
                </p>
              ) : null}
            </div>

            <IconButton
              aria-label={closeLabel}
              variant="subtle"
              icon={<XIcon size={18} />}
              onClick={() => onOpenChange(false)}
            />
          </div>
        </div>

        {/* Scrollable Body with Custom Scrollbar */}
        <div className="flex-1 overflow-y-auto unify-scroll px-4 py-3.5 md:px-6 md:py-5 flex flex-col gap-3.5 md:gap-4">
          {children}
        </div>

        {/* Pinned Footer */}
        {footer ? (
          <div className="shrink-0 border-t border-border/75 bg-surface/95 px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] md:px-6 md:py-4 flex flex-col gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
