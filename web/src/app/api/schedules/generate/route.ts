import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { addDays, format, getISOWeek, getYear } from 'date-fns'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autentikasi diperlukan.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as any)?.role !== 'pengurus') {
      return NextResponse.json({ error: 'Hanya Pengurus yang dapat membuat jadwal otomatis.' }, { status: 403 })
    }

    const { daysCount = 30 } = await request.json().catch(() => ({ daysCount: 30 }))
    const adminSupabase = createAdminClient()
    const today = new Date()
    const schedulesToInsert = []

    const selebranList = [
      'Romo Robertus Budi Prastowo, Pr',
      'Romo Yohanes Rasul Edy Purwanto, Pr',
    ]

    for (let i = 0; i < daysCount; i++) {
      const targetDate = addDays(today, i)
      const dayOfWeek = targetDate.getDay() // 0 = Minggu, 6 = Sabtu
      const dateStr = format(targetDate, 'yyyy-MM-dd')
      const weekNumber = getISOWeek(targetDate)
      const yearNumber = getYear(targetDate)

      // 1. Misa Harian: Senin - Sabtu (05:30 WIB, kuota 8)
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
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
          nama_selebran: selebranList[i % selebranList.length],
        })
      }

      // 2. Misa Mingguan: Sabtu Sore (17:00 WIB, kuota 12)
      if (dayOfWeek === 6) {
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
          nama_selebran: '-',
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
            nama_selebran: '-',
          })
        }
      }
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
      message: `Berhasil membuat ${data.length} jadwal misa otomatis untuk kurun waktu ${daysCount} hari ke depan!`,
      count: data.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal generate jadwal.' }, { status: 500 })
  }
}
