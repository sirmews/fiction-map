import React from "react";
import type { EdgeLabelProps } from "../types";

/**
 * EdgeLabel - Label component for edges.
 * 
 * @example
 * ```tsx
 * <EdgeLabel animated valid>
 *   Go north
 * </EdgeLabel>
 * ```
 */
export function EdgeLabel({
  children,
  valid = true,
  animated = false,
  className = "",
}: EdgeLabelProps): JSX.Element {
  return (
    <div
      className={[
        "px-2 py-1 rounded text-xs font-medium",
        "bg-background border shadow-sm",
        valid ? "text-foreground" : "text-destructive border-destructive/50",
        animated && "italic",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

/**
 * EdgeLabelText - Simple text label for edges.
 */
export function EdgeLabelText({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={["text-xs text-muted-foreground", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
