import { WarnaLiturgi } from '@/types/database'

export interface LiturgyColorStyle {
  label: WarnaLiturgi
  bgClass: string
  textClass: string
  borderClass: string
  badgeClass: string
  dotClass: string
  description: string
}

export const LITURGY_COLORS: Record<WarnaLiturgi, LiturgyColorStyle> = {
  'Hijau': {
    label: 'Hijau',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500',
    description: 'Masa Biasa: Lambang Harapan, Pertumbuhan Iman, dan Kehidupan Baru'
  },
  'Putih': {
    label: 'Putih',
    bgClass: 'bg-amber-50/80',
    textClass: 'text-amber-900',
    borderClass: 'border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    dotClass: 'bg-amber-400',
    description: 'Hari Raya & Pesta Sukacita: Natal, Paskah, Maria, dan Orang Kudus Bukan Martir'
  },
  'Merah': {
    label: 'Merah',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-800',
    borderClass: 'border-rose-300',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-600',
    description: 'Hari Raya Roh Kudus, Minggu Palma, Jumat Agung, dan Para Martir'
  },
  'Ungu': {
    label: 'Ungu',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-800',
    borderClass: 'border-purple-300',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    dotClass: 'bg-purple-600',
    description: 'Masa Tobat & Penantian: Masa Adven dan Masa Prapaskah'
  },
  'Merah Muda': {
    label: 'Merah Muda',
    bgClass: 'bg-pink-50',
    textClass: 'text-pink-800',
    borderClass: 'border-pink-300',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-300',
    dotClass: 'bg-pink-500',
    description: 'Minggu Sukacita: Minggu Gaudete (Adven III) dan Minggu Laetare (Prapaskah IV)'
  }
}

export function getLiturgyStyle(warna: WarnaLiturgi): LiturgyColorStyle {
  return LITURGY_COLORS[warna] || LITURGY_COLORS['Hijau']
}
