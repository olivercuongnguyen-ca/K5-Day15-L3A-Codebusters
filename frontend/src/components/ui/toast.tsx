"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  XIcon,
} from "./icons";

export type ToastTone = "success" | "warning" | "danger" | "info";

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  open?: boolean;
  onClose?: () => void;
  durationMs?: number;
  inline?: boolean;
  className?: string;
}

const toneIconMap: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircleIcon size={18} className="text-emerald-300 shrink-0" />,
  warning: <AlertTriangleIcon size={18} className="text-amber-200 shrink-0" />,
  danger: <AlertCircleIcon size={18} className="text-rose-200 shrink-0" />,
  info: <InfoIcon size={18} className="text-lilac shrink-0" />,
};

export function Toast({
  message,
  tone = "success",
  open = true,
  onClose,
  durationMs = 3500,
  inline = false,
  className,
}: ToastProps) {
  useEffect(() => {
    if (inline || !open || !onClose || durationMs <= 0) return;

    const timer = window.setTimeout(() => {
      onClose();
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [inline, open, onClose, durationMs]);

  if (!open) return null;

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-text-primary text-surface shadow-toast",
        "max-w-[calc(100vw-32px)]",
        !inline && "animate-unify-surface",
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex shrink-0">
        {toneIconMap[tone]}
      </span>
      <span className="text-[13px] leading-[18px] font-medium text-pretty">
        {message}
      </span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="inline-flex items-center justify-center w-7 h-7 -mr-1 rounded-full text-surface/80 hover:text-surface hover:bg-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface cursor-pointer"
        >
          <XIcon size={14} />
        </button>
      ) : null}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center w-full px-4">
      <div className="pointer-events-auto">{content}</div>
    </div>
  );
}
