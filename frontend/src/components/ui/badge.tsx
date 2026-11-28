import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "neutral"
  | "sage"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-high text-[#4C464F] border border-transparent font-medium",
  sage: "bg-emerald-100 text-emerald-800 border border-transparent font-semibold",
  primary: "bg-primary text-on-primary border border-transparent font-semibold",
  secondary: "bg-sage-background text-on-sage border border-transparent font-semibold",
  success: "bg-emerald-100 text-emerald-800 border border-transparent font-semibold",
  warning: "bg-amber-100 text-amber-800 border border-transparent font-semibold",
  danger: "bg-rose-100 text-rose-800 border border-transparent font-semibold",
  info: "bg-sky-100 text-sky-800 border border-transparent font-semibold",
  outline: "bg-transparent text-[#4C464F] border border-border font-medium",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10.5px] md:text-[11px] leading-[14px] md:leading-[16px] gap-1",
  md: "px-2.5 py-0.5 md:px-3 md:py-1 text-[11.5px] md:text-[12px] leading-[15px] md:leading-[16px] gap-1.5",
};

export function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full whitespace-nowrap select-none shrink-0",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-current shrink-0"
        />
      ) : null}
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
