import React from "react";
import type { Node } from "@xyflow/react";
import {
  NodeCard,
  NodeCardHeader,
  NodeCardBody,
  NodeCardFooter,
  TargetHandle,
  SourceHandle,
} from "./NodeCard";
import { NodeBadge } from "./NodeBadge";
import { NodeTitle, NodeDescription, NodeMeta, NodeId } from "./NodeField";
import type { GraphAnnotation } from "../types";

interface DefaultNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected: boolean;
  annotation?: GraphAnnotation;
  color?: string;
}

/**
 * DefaultNode - Generic node renderer.
 * 
 * Displays:
 * - Title (from data.title or data.name or id)
 * - Description (from data.description, truncated)
 * - Color bar (if color prop provided)
 * - Annotation badge (if provided)
 * 
 * This is the "Tier 1" default - functional but generic.
 */
export function DefaultNode({
  id,
  data,
  selected,
  annotation,
  color,
}: DefaultNodeProps): JSX.Element {
  const title = String(data.title ?? data.name ?? id);
  const description = data.description ? String(data.description) : undefined;
  
  return (
    <NodeCard selected={selected}>
      <TargetHandle color={color} />
      
      <NodeCardHeader color={color}>
        <div className="flex flex-wrap items-center gap-1.5">
          {annotation && (
            <NodeBadge
              variant={annotation.type === "error" ? "error" : annotation.type === "warning" ? "warning" : "default"}
            >
              {annotation.label}
            </NodeBadge>
          )}
        </div>
        
        <NodeTitle>{title}</NodeTitle>
        <NodeId>{id}</NodeId>
      </NodeCardHeader>
      
      {description && (
        <NodeCardBody>
          <NodeDescription truncate lines={2}>
            {description}
          </NodeDescription>
        </NodeCardBody>
      )}
      
      <SourceHandle color={color} />
    </NodeCard>
  );
}

/**
 * Create a node renderer with custom colors.
 */
export function createDefaultNodeWithColors(
  colorMap: Record<string, string>
): (props: DefaultNodeProps) => JSX.Element {
  return (props: DefaultNodeProps) => {
    const nodeType = props.data.type as string | undefined;
    const color = nodeType ? colorMap[nodeType] : undefined;
    return <DefaultNode {...props} color={color} />;
  };
}
