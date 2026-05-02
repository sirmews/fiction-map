import React from "react";
import { Handle, Position, type HandleProps } from "@xyflow/react";
import type { NodePrimitiveProps } from "../types";

/**
 * NodeCard - Container for custom nodes.
 * 
 * Provides consistent styling for selection state, border, and layout.
 * 
 * @example
 * ```tsx
 * <NodeCard selected={selected}>
 *   <NodeBadge>Chapter 1</NodeBadge>
 *   <NodeField weight="semibold">{data.title}</NodeField>
 * </NodeCard>
 * ```
 */
export function NodeCard({
  selected,
  className = "",
  style,
  children,
}: NodePrimitiveProps): JSX.Element {
  return (
    <div
      className={[
        "node-card",
        "overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-all duration-200",
        selected ? "ring-2 ring-ring ring-offset-2" : "hover:shadow-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * NodeCardHeader - Header section with optional color bar.
 */
export function NodeCardHeader({
  color,
  children,
  className = "",
}: {
  color?: string;
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={className}>
      {color && (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: color }}
        />
      )}
      {children && (
        <div className="px-3 pt-2.5 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * NodeCardBody - Main content area.
 */
export function NodeCardBody({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={["px-3 py-2", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

/**
 * NodeCardFooter - Footer section for metadata.
 */
export function NodeCardFooter({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={["px-3 pb-2.5", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

/**
 * NodeHandle - Connection handle wrapper.
 * 
 * Wraps React Flow's Handle with sensible defaults.
 */
export function NodeHandle({
  type,
  position = Position.Bottom,
  color,
  className = "",
  ...props
}: HandleProps & { color?: string }): JSX.Element {
  return (
    <Handle
      type={type}
      position={position}
      className={[
        "w-3 h-3 rounded-sm border-2 border-background",
        type === "target" ? "-top-px" : "-bottom-px",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={color ? { backgroundColor: color } : undefined}
      {...props}
    />
  );
}

/**
 * TargetHandle - Convenience component for target handles.
 */
export function TargetHandle({
  position = Position.Top,
  ...props
}: Omit<HandleProps, "type"> & { color?: string }): JSX.Element {
  return (
    <NodeHandle
      type="target"
      position={position}
      {...props}
    />
  );
}

/**
 * SourceHandle - Convenience component for source handles.
 */
export function SourceHandle({
  position = Position.Bottom,
  ...props
}: Omit<HandleProps, "type"> & { color?: string }): JSX.Element {
  return (
    <NodeHandle
      type="source"
      position={position}
      {...props}
    />
  );
}
