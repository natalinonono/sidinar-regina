'use client'

import { useEffect } from 'react'

/**
 * Peringatan Keamanan Anti-Self-XSS di Browser Console
 * Mencegah pengguna mem-paste skrip sembarangan di Google Chrome DevTools / Inspect Console.
 */
export function SecurityConsoleNotice() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const bannerStyle =
        'background-color: #991b1b; color: #ffffff; font-size: 20px; font-weight: bold; padding: 6px 12px; border-radius: 6px; font-family: sans-serif;'
      const titleStyle =
        'color: #dc2626; font-size: 16px; font-weight: bold; font-family: sans-serif;'
      const bodyStyle =
        'color: #334155; font-size: 13px; line-height: 1.6; font-family: sans-serif;'
      const subStyle =
        'color: #0284c7; font-size: 12px; font-weight: 600; font-family: sans-serif;'

      console.log('%c⚠️ PERINGATAN KEAMANAN - SIDINAR REGINA', bannerStyle)
      console.log(
        '%cFitur Browser Console / Inspect Element ini hanya diperuntukkan bagi pengembang sistem.',
        titleStyle
      )
      console.log(
        '%cJANGAN PERNAH menyalin (copy) atau menempelkan (paste) kode skrip ke dalam konsol ini atas instruksi siapa pun.\n' +
        'Tindakan tersebut merupakan modus serangan siber "Self-XSS" yang dapat disalahgunakan pihak tidak bertanggung jawab untuk mencuri sesi login Anda.\n\n' +
        '🛡️ Seluruh otorisasi data (hak akses, jadwal, kuota, dan presensi) dilindungi enkripsi server Supabase RLS & Token JWT.',
        bodyStyle
      )
      console.log('%cSiDinar Regina • Paroki SPMR Purbowardayan', subStyle)
    }
  }, [])

  return null
}

