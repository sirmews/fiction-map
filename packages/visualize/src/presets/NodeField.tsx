import React from "react"

export function NodeTitle({ children }: { children: React.ReactNode }): JSX.Element {
  return <h3 className="text-sm font-semibold text-gray-900">{children}</h3>
}

export function NodeId({ children }: { children: React.ReactNode }): JSX.Element {
  return <span className="text-xs text-gray-400 font-mono">{children}</span>
}

interface NodeDescriptionProps {
  children: React.ReactNode
  truncate?: boolean
  lines?: number
}

export function NodeDescription({ children, truncate, lines }: NodeDescriptionProps): JSX.Element {
  const style = truncate && lines
    ? {
        display: "-webkit-box" as const,
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden" as const,
      }
    : undefined

  return (
    <p className="text-xs text-gray-600" style={style}>
      {children}
    </p>
  )
}

export function NodeMeta({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="text-xs text-gray-500 mt-1">{children}</div>
}
