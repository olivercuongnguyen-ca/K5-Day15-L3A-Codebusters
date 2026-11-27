import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { LoaderIcon } from "./icons";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary border border-transparent hover:bg-primary-pressed active:bg-primary-pressed shadow-[0_4px_14px_rgba(23,23,25,0.16)]",
  secondary:
    "bg-sage-background text-on-sage border border-olive/40 hover:bg-olive/25 active:bg-olive/35",
  outline:
    "bg-surface text-text-primary border border-border hover:bg-surface-subtle active:bg-surface-subtle",
  ghost:
    "bg-transparent text-primary border border-transparent hover:bg-surface-subtle active:bg-primary-container/60",
  danger:
    "bg-danger text-on-danger border border-transparent hover:bg-danger-pressed active:bg-danger-pressed",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-8 md:min-h-9 px-3 md:px-4 text-[12px] md:text-[13px] leading-[16px] md:leading-[18px] font-medium gap-1.5",
  md: "min-h-9 md:min-h-10 px-4 md:px-5 text-[13px] md:text-[14px] leading-[18px] md:leading-[20px] font-medium gap-1.5",
  lg: "min-h-10 md:min-h-11 px-5 md:px-6 text-[13.5px] md:text-[15px] leading-[19px] md:leading-[20px] font-medium gap-2",
};

export function Button({
  variant = "primary",
  size = "lg",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-full whitespace-nowrap select-none",
        "transition-colors duration-[180ms] ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "cursor-pointer disabled:cursor-not-allowed disabled:bg-background disabled:text-text-secondary disabled:border-border disabled:shadow-none disabled:opacity-80",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <LoaderIcon
          size={18}
          className="animate-spin motion-reduce:animate-none shrink-0"
        />
      ) : leftIcon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {leftIcon}
        </span>
      ) : null}
      <span>{children}</span>
      {!loading && rightIcon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {rightIcon}
        </span>
      ) : null}
    </button>
  );
}
