import React from 'react'
import { WarnaLiturgi } from '@/types/database'
import { getLiturgyStyle } from '@/lib/utils/liturgy'

interface LiturgyBadgeProps {
  warna: WarnaLiturgi
  tahunLiturgi?: string
  showDescription?: boolean
}

export const LiturgyBadge: React.FC<LiturgyBadgeProps> = ({
  warna,
  tahunLiturgi,
  showDescription = false,
}) => {
  const style = getLiturgyStyle(warna)

  return (
    <div className="inline-flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.badgeClass} shadow-sm`}>
        <span className={`w-2 h-2 rounded-full ${style.dotClass}`} />
        <span>Warna {style.label}</span>
        {tahunLiturgi && (
          <span className="opacity-80 font-normal">({tahunLiturgi})</span>
        )}
      </div>
      {showDescription && (
        <span className="text-[11px] text-on-surface-variant italic leading-tight">
          {style.description}
        </span>
      )}
    </div>
  )
}
