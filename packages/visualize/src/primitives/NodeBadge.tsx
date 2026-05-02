import React from "react";
import type { NodeBadgeProps } from "../types";

const BADGE_VARIANTS = {
  default: "bg-muted text-muted-foreground border-border",
  muted: "bg-muted/50 text-muted-foreground border-muted",
  success: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  error: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

/**
 * NodeBadge - Small label for status, categories, etc.
 * 
 * @example
 * ```tsx
 * <NodeBadge color="blue">Chapter 1</NodeBadge>
 * <NodeBadge variant="error">Missing</NodeBadge>
 * ```
 */
export function NodeBadge({
  children,
  color,
  variant = "default",
  className = "",
}: NodeBadgeProps): JSX.Element {
  const variantClasses = BADGE_VARIANTS[variant];
  
  return (
    <span
      className={[
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        variantClasses,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={color ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {children}
    </span>
  );
}

/**
 * NodeBadgeGroup - Container for multiple badges.
 */
export function NodeBadgeGroup({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={["flex flex-wrap items-center gap-1.5", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
