"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";
import { XIcon } from "./icons";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  showCloseButton = false,
  className,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
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
      if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
        const focusable = panelRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        (focusable ?? panelRef.current).focus();
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-[#171719]/38 backdrop-blur-[6px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "w-full max-w-[430px] bg-surface border border-border/90 rounded-[22px] md:rounded-[26px] p-5 md:p-6",
          "shadow-[0_24px_60px_-12px_rgba(23,23,25,0.22),0_8px_24px_-6px_rgba(92,67,117,0.12)]",
          "flex flex-col gap-3.5 md:gap-4 animate-unify-surface focus:outline-none",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 md:gap-1.5">
            <h2
              id={titleId}
              className="text-[16px] leading-[22px] md:text-[18px] md:leading-[26px] font-semibold tracking-[-0.1px] text-text-primary"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="text-[13.5px] leading-[20px] md:text-[14.5px] md:leading-[22px] text-text-secondary text-pretty"
              >
                {description}
              </p>
            ) : null}
          </div>

          {showCloseButton ? (
            <IconButton
              aria-label="Đóng hộp thoại"
              variant="subtle"
              icon={<XIcon size={18} />}
              onClick={() => onOpenChange(false)}
            />
          ) : null}
        </div>

        {children ? <div className="flex flex-col gap-3">{children}</div> : null}

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-border/70">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
