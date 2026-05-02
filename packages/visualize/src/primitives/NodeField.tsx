import React from "react";
import type { NodeFieldProps } from "../types";

const WEIGHT_CLASSES = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

/**
 * NodeField - Display a field with optional label.
 * 
 * @example
 * ```tsx
 * <NodeField label="Title" weight="semibold">
 *   {data.title}
 * </NodeField>
 * 
 * <NodeField truncate lines={2}>
 *   {data.description}
 * </NodeField>
 * ```
 */
export function NodeField({
  label,
  children,
  weight = "normal",
  truncate = false,
  lines,
  className = "",
}: NodeFieldProps): JSX.Element {
  const weightClass = WEIGHT_CLASSES[weight];
  
  const truncateClass = truncate
    ? lines
      ? `line-clamp-${lines}`
      : "truncate"
    : "";
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
          {label}
        </label>
      )}
      <div
        className={["text-sm leading-relaxed", weightClass, truncateClass]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * NodeTitle - Convenience component for node titles.
 */
export function NodeTitle({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <p
      className={["text-sm leading-tight font-medium", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}

/**
 * NodeDescription - Convenience component for descriptions.
 */
export function NodeDescription({
  children,
  truncate = true,
  lines = 2,
  className = "",
}: {
  children?: React.ReactNode;
  truncate?: boolean;
  lines?: number;
  className?: string;
}): JSX.Element {
  return (
    <p
      className={[
        "text-xs leading-relaxed text-muted-foreground italic",
        truncate && `line-clamp-${lines}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}

/**
 * NodeMeta - Convenience component for metadata (IDs, counts, etc).
 */
export function NodeMeta({
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

/**
 * NodeId - Display a node ID in monospace.
 */
export function NodeId({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={["font-mono text-[10px] text-muted-foreground/50", className]
        .filter(Boolean)
        .join(" ")}
    >
      #{children}
    </span>
  );
}
