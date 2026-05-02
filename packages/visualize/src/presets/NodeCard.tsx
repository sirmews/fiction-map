import React from "react"
import { Handle, Position, type HandleProps } from "@xyflow/react"

interface NodeCardProps {
  selected?: boolean
  children: React.ReactNode
}

export function NodeCard({ selected, children }: NodeCardProps): JSX.Element {
  return (
    <div
      className={`
        bg-white border border-gray-200 rounded-lg shadow-sm
        min-w-[150px] max-w-[300px]
        ${selected ? "ring-2 ring-blue-500 border-blue-500" : ""}
      `}
    >
      {children}
    </div>
  )
}

interface NodeCardHeaderProps {
  color?: string
  children: React.ReactNode
}

export function NodeCardHeader({ color, children }: NodeCardHeaderProps): JSX.Element {
  return (
    <div
      className="px-3 py-2 border-b border-gray-100"
      style={color ? { borderLeft: `4px solid ${color}` } : undefined}
    >
      {children}
    </div>
  )
}

export function NodeCardBody({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="px-3 py-2">{children}</div>
}

export function NodeCardFooter({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="px-3 py-2 border-t border-gray-100">{children}</div>
}

interface HandleWrapperProps extends Partial<HandleProps> {
  color?: string
}

export function TargetHandle({ color, ...props }: HandleWrapperProps): JSX.Element {
  return (
    <Handle
      type="target"
      position={Position.Left}
      className="!bg-gray-400 !w-2 !h-2 !border-2 !border-white"
      style={color ? { backgroundColor: color } : undefined}
      {...props}
    />
  )
}

export function SourceHandle({ color, ...props }: HandleWrapperProps): JSX.Element {
  return (
    <Handle
      type="source"
      position={Position.Right}
      className="!bg-gray-400 !w-2 !h-2 !border-2 !border-white"
      style={color ? { backgroundColor: color } : undefined}
      {...props}
    />
  )
}
