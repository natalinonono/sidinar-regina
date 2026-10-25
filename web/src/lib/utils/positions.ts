export interface LiturgicalPosition {
  id: string
  name: string
  latinName: string
  description: string
  icon: string
  minJenjang?: string
}

export const LITURGICAL_POSITIONS: LiturgicalPosition[] = [
  {
    id: 'crucifer',
    name: 'Pembawa Salib Prosesi',
    latinName: 'Crucifer',
    description: 'Memimpin barisan perarakan masuk dan keluar dengan membawa Salib Kristus tegak lurus.',
    icon: 'cross',
    minJenjang: 'SMP'
  },
  {
    id: 'ceroferarius_1',
    name: 'Pembawa Lilin I (Kanan)',
    latinName: 'Ceroferarius I',
    description: 'Mendampingi Salib dalam prosesi serta mengapit Mimbar Sabda saat pembacaan Injil.',
    icon: 'flame',
    minJenjang: 'SD'
  },
  {
    id: 'ceroferarius_2',
    name: 'Pembawa Lilin II (Kiri)',
    latinName: 'Ceroferarius II',
    description: 'Mendampingi Salib dalam prosesi serta mengapit Mimbar Sabda saat pembacaan Injil.',
    icon: 'flame',
    minJenjang: 'SD'
  },
  {
    id: 'acolyte_kredens',
    name: 'Petugas Altar & Meja Kredens',
    latinName: 'Acolyte - Credence',
    description: 'Mempersiapkan sibori, piala, korporale, palla, serta melayani Imam saat persembahan.',
    icon: 'table_restaurant',
    minJenjang: 'SMP'
  },
  {
    id: 'acolyte_lavabo',
    name: 'Petugas Lavabo & Bel / Genta',
    latinName: 'Acolyte - Lavabo & Bells',
    description: 'Membawa ampul air & anggur, melayani pembasuhan tangan imam (Lavabo), dan membunyikan genta saat Doa Syukur Agung.',
    icon: 'notifications_active',
    minJenjang: 'SD'
  },
  {
    id: 'thurifer',
    name: 'Pembawa Pedupaan / Wiruk',
    latinName: 'Thurifer',
    description: 'Membawa wiruk dengan dupa wangi untuk mendupai Altar, Persembahan, Salib, Kitab Suci, dan Umat.',
    icon: 'wb_incandescent',
    minJenjang: 'SMA/K'
  },
  {
    id: 'navicularius',
    name: 'Pembawa Wadah Dupa (Navikula)',
    latinName: 'Navicularius',
    description: 'Mendampingi Thurifer dengan membawa wadah dupa serta menyodorkan sendok dupa kepada Imam.',
    icon: 'cookie',
    minJenjang: 'SMP'
  },
  {
    id: 'master_ceremony',
    name: 'Pemimpin Barisan & Sakristan',
    latinName: 'Master of Ceremonies',
    description: 'Mengatur ketertiban tata gerak liturgi, sinkronisasi langkah prosesi, dan buku misa altar.',
    icon: 'military_tech',
    minJenjang: 'SMA/K'
  },
  {
    id: 'petugas_umum',
    name: 'Petugas Altar / Cadangan',
    latinName: 'General Altar Server',
    description: 'Petugas perarakan dan pembantu kesiapan sakristi sebelum dan sesudah perayaan Ekaristi.',
    icon: 'person',
    minJenjang: 'SD'
  }
]

export function getPositionById(id: string): LiturgicalPosition {
  return LITURGICAL_POSITIONS.find(p => p.id === id || p.name === id || p.latinName === id) || LITURGICAL_POSITIONS[LITURGICAL_POSITIONS.length - 1]
}
