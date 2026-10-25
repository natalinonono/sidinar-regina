import React from 'react'
import { getPositionById } from '@/lib/utils/positions'

interface PositionBadgeProps {
  position: string
  className?: string
}

export const PositionBadge: React.FC<PositionBadgeProps> = ({ position, className = '' }) => {
  const posObj = getPositionById(position)

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-primary font-medium text-xs border border-primary/10 shadow-sm ${className}`}
      title={posObj.description}
    >
      <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {posObj.icon}
      </span>
      <span className="font-semibold">{posObj.latinName}</span>
      <span className="text-on-surface-variant font-normal hidden sm:inline">({posObj.name})</span>
    </span>
  )
}
