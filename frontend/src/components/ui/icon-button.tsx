import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconButtonVariant = "surface" | "subtle" | "ghost" | "primary";
export type IconButtonSize = "md" | "lg";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  "aria-label": string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  hasDot?: boolean;
  pressed?: boolean;
}

const variantClasses: Record<IconButtonVariant, string> = {
  surface:
    "bg-surface text-text-primary border border-border hover:bg-surface-subtle active:bg-surface-subtle shadow-card-sm",
  subtle:
    "bg-surface-subtle text-text-primary border border-border hover:bg-primary-container active:bg-primary-container",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:bg-surface-subtle hover:text-text-primary",
  primary:
    "bg-primary text-on-primary border border-transparent hover:bg-primary-pressed active:bg-primary-pressed",
};

const sizeClasses: Record<IconButtonSize, string> = {
  md: "w-9 h-9 md:w-11 md:h-11",
  lg: "w-10 h-10 md:w-12 md:h-12",
};

export function IconButton({
  icon,
  variant = "surface",
  size = "md",
  hasDot = false,
  pressed,
  disabled,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-pressed={pressed}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full shrink-0",
        "transition-colors duration-[180ms] ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "cursor-pointer disabled:cursor-not-allowed disabled:bg-background disabled:text-text-secondary disabled:border-border disabled:opacity-70",
        variantClasses[variant],
        sizeClasses[size],
        pressed && variant !== "primary" && "bg-sage-background border-olive text-on-sage",
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex items-center justify-center">
        {icon}
      </span>
      {hasDot ? (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 md:top-2.5 md:right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface"
        />
      ) : null}
    </button>
  );
}
