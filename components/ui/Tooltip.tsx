'use client'
import { ReactNode } from 'react'

export function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return (
    <div className="tooltip-wrap">
      {children}
      <span className="tooltip-content">{content}</span>
    </div>
  )
}
