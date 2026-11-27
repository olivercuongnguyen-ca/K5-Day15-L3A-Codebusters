import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  tabularNums?: boolean;
  containerClassName?: string;
}

export function Input({
  label,
  helperText,
  error,
  leftIcon,
  rightSlot,
  tabularNums = false,
  id,
  disabled,
  readOnly,
  className,
  containerClassName,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error);

  const describedBy = [hasError ? errorId : null, helperText && !hasError ? helperId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-[12px] md:text-[13px] leading-[16px] md:leading-[18px] font-medium text-text-primary"
        >
          {label}
        </label>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          {leftIcon ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 inline-flex items-center justify-center text-text-secondary"
            >
              {leftIcon}
            </span>
          ) : null}

          <input
            id={inputId}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            className={cn(
              "w-full min-h-10 md:min-h-12 rounded-[14px] md:rounded-[16px] border text-[14px] md:text-[15px] leading-[20px] md:leading-[22px] text-text-primary placeholder:text-text-secondary/80",
              "transition-colors duration-[180ms] ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              leftIcon ? "pl-10 md:pl-11 pr-3.5 md:pr-4" : "px-3.5 md:px-4",
              hasError
                ? "bg-danger-background border-danger focus-visible:ring-danger"
                : "bg-background border-border focus:border-primary focus-visible:ring-primary",
              readOnly && !hasError && "bg-background/90 text-text-primary",
              disabled && "cursor-not-allowed bg-surface-subtle/60 text-text-secondary opacity-80",
              tabularNums && "tabular-nums",
              className,
            )}
            {...rest}
          />
        </div>

        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>

      {hasError ? (
        <p id={errorId} className="text-[12px] md:text-[13px] leading-[18px] md:leading-[20px] text-on-danger-background">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[12px] md:text-[13px] leading-[18px] md:leading-[20px] text-text-secondary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
