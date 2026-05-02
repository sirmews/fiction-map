import React from "react"

interface NodeBadgeProps {
  variant?: "default" | "error" | "warning" | "success"
  children: React.ReactNode
}

const variantStyles = {
  default: "bg-gray-100 text-gray-700",
  error: "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  success: "bg-green-100 text-green-700",
}

export function NodeBadge({ variant = "default", children }: NodeBadgeProps): JSX.Element {
  return (
    <span
      className={`
        inline-flex items-center px-1.5 py-0.5
        text-xs font-medium rounded
        ${variantStyles[variant]}
      `}
    >
      {children}
    </span>
  )
}
