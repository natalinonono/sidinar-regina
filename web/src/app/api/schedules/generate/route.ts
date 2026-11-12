import { NextResponse } from 'next/server'
import { requirePengurusUser } from '@/lib/supabase/authGuard'
import { addDays } from 'date-fns'
import { getLiturgicalWeekForDate, toWibDateString } from '@/lib/utils/time'

export async function POST(request: Request) {
  try {
    const auth = await requirePengurusUser()
    if (auth.errorResponse) return auth.errorResponse

    const { daysCount = 30 } = await request.json().catch(() => ({ daysCount: 30 }))
    const safeDays = Math.min(Math.max(parseInt(String(daysCount), 10) || 30, 1), 90)
    const adminSupabase = (auth as any).adminSupabase

    // Gunakan basis kalender Asia/Jakarta (WIB) agar konsisten di Vercel UTC
    const wibTodayStr = toWibDateString()
    const [y, m, d] = wibTodayStr.split('-').map(Number)
    const wibBaseDate = new Date(y, m - 1, d, 12, 0, 0)
    const wibEndDateStr = toWibDateString(addDays(wibBaseDate, safeDays))

    const { data: existingSchedules } = await (adminSupabase as any)
      .from('mass_schedules')
      .select('tanggal_misa, jam_mulai')
      .gte('tanggal_misa', wibTodayStr)
      .lte('tanggal_misa', wibEndDateStr)

    const existingKeys = new Set(
      (existingSchedules || []).map(
        (s: any) => `${s.tanggal_misa}|${String(s.jam_mulai || '').substring(0, 5)}`
      )
    )

    const schedulesToInsert: any[] = []

    for (let i = 0; i < safeDays; i++) {
      const targetDate = addDays(wibBaseDate, i)
      const dayOfWeek = targetDate.getDay() // 0 = Minggu, 6 = Sabtu
      const pad = (n: number) => n.toString().padStart(2, '0')
      const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`
      const { weekNumber, yearNumber } = getLiturgicalWeekForDate(dateStr)

      // 1. Misa Harian: Senin - Sabtu (05:30 WIB, kuota 8)
      if (dayOfWeek >= 1 && dayOfWeek <= 6 && !existingKeys.has(`${dateStr}|05:30`)) {
        const dayNames = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
        schedulesToInsert.push({
          judul_misa: `Misa Pagi Harian ${dayNames[dayOfWeek]}`,
          kategori: 'harian' as const,
          tanggal_misa: dateStr,
          jam_mulai: '05:30:00',
          kuota_maksimal: 8,
          minggu_ke: weekNumber,
          tahun: yearNumber,
          tahun_liturgi: 'Tahun B / II',
          warna_liturgi: (dayOfWeek === 4 ? 'Putih' : 'Hijau') as any,
          nama_selebran: '',
        })
      }

      // 2. Misa Mingguan: Sabtu Sore (17:00 WIB, kuota 12)
      if (dayOfWeek === 6 && !existingKeys.has(`${dateStr}|17:00`)) {
        schedulesToInsert.push({
          judul_misa: 'Misa Mingguan Sabtu Sore',
          kategori: 'mingguan' as const,
          tanggal_misa: dateStr,
          jam_mulai: '17:00:00',
          kuota_maksimal: 12,
          minggu_ke: weekNumber,
          tahun: yearNumber,
          tahun_liturgi: 'Tahun B / II',
          warna_liturgi: 'Hijau' as any,
          nama_selebran: '',
        })
      }

      // 3. Misa Mingguan Hari Minggu: Pagi (06:00, 08:00 WIB) & Sore (16:00, 18:00 WIB) (kuota 12)
      if (dayOfWeek === 0) {
        const sundaySessions = [
          { jam: '06:00:00', title: 'Misa Mingguan Pagi' },
          { jam: '08:00:00', title: 'Misa Mingguan Pagi' },
          { jam: '16:00:00', title: 'Misa Mingguan Sore' },
          { jam: '18:00:00', title: 'Misa Mingguan Sore' },
        ]

        for (const s of sundaySessions) {
          if (!existingKeys.has(`${dateStr}|${s.jam.substring(0, 5)}`)) {
            schedulesToInsert.push({
              judul_misa: s.title,
              kategori: 'mingguan' as const,
              tanggal_misa: dateStr,
              jam_mulai: s.jam,
              kuota_maksimal: 12,
              minggu_ke: weekNumber,
              tahun: yearNumber,
              tahun_liturgi: 'Tahun B / II',
              warna_liturgi: 'Hijau' as any,
              nama_selebran: '',
            })
          }
        }
      }
    }

    if (schedulesToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Seluruh jadwal misa untuk ${safeDays} hari ke depan sudah tersedia (tidak ada jadwal baru yang perlu ditambahkan).`,
        count: 0,
      })
    }

    const { data, error } = await (adminSupabase as any)
      .from('mass_schedules')
      .insert(schedulesToInsert)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil membuat ${data.length} jadwal misa otomatis untuk kurun waktu ${safeDays} hari ke depan!`,
      count: data.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal generate jadwal.' }, { status: 500 })
  }
}
