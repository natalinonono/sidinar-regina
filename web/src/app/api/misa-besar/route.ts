import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/authGuard'
import { isTableMissingError, MISA_BESAR_MIGRATION_SQL } from '@/lib/utils/misaBesar'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser()
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(request.url)
    const currentYear = new Date().getFullYear()
    const tahunParam = parseInt(searchParams.get('tahun') || String(currentYear), 10)
    const tahun = Number.isNaN(tahunParam) ? currentYear : tahunParam

    const admin = auth.adminSupabase

    // 1. Fetch events for the target year
    const { data: eventsData, error: eventsErr } = await (admin as any)
      .from('misa_besar_events')
      .select('*')
      .eq('tahun', tahun)
      .order('urutan_tampil', { ascending: true })
      .order('created_at', { ascending: true })

    if (eventsErr) {
      if (isTableMissingError(eventsErr)) {
        return NextResponse.json({
          success: false,
          needs_migration: true,
          migration_sql: MISA_BESAR_MIGRATION_SQL,
          is_pengurus: auth.isPengurus,
          tahun,
          events: [],
          absensi: [],
        })
      }
      return NextResponse.json({ error: eventsErr.message }, { status: 500 })
    }

    const events = eventsData || []
    const eventIds = events.map((e: any) => e.id)

    let sessions: any[] = []
    let latihan: any[] = []
    let petugas: any[] = []
    let absensi: any[] = []

    if (eventIds.length > 0) {
      const [sessionsRes, latihanRes, petugasRes] = await Promise.all([
        (admin as any)
          .from('misa_besar_sessions')
          .select('*')
          .in('event_id', eventIds)
          .order('urutan', { ascending: true }),
        (admin as any)
          .from('misa_besar_latihan')
          .select('*')
          .in('event_id', eventIds)
          .order('tanggal_latihan', { ascending: true })
          .order('jam_mulai', { ascending: true }),
        (admin as any)
          .from('misa_besar_petugas')
          .select('*, profile:profiles(id, nama_lengkap, nama_panggilan, jenjang, asal_wilayah_teks, no_telepon, email, role, status)')
          .in('event_id', eventIds)
          .order('created_at', { ascending: true }),
      ])

      sessions = sessionsRes.data || []
      latihan = latihanRes.data || []
      petugas = petugasRes.data || []

      // Privacy masking if caller is not Pengurus
      if (!auth.isPengurus) {
        petugas = petugas.map((p: any) => {
          if (p.profile && p.user_id !== auth.user!.id) {
            const { no_telepon, email, ...safeProfile } = p.profile
            return { ...p, profile: safeProfile }
          }
          return p
        })
      }

      const latihanIds = latihan.map((l: any) => l.id)
      if (latihanIds.length > 0) {
        let absQuery = (admin as any)
          .from('misa_besar_absensi')
          .select('*')
          .in('latihan_id', latihanIds)

        if (!auth.isPengurus) {
          absQuery = absQuery.eq('user_id', auth.user!.id)
        }

        const { data: absData } = await absQuery
        absensi = absData || []
      }
    }

    // Nest sessions, latihan, and petugas neatly under their respective events
    const enrichedEvents = events.map((ev: any) => {
      const evSessions = sessions.filter((s) => s.event_id === ev.id)
      const evLatihan = latihan.filter((l) => l.event_id === ev.id)
      const evPetugas = petugas
        .filter((p) => p.event_id === ev.id)
        .map((p) => ({
          ...p,
          session: evSessions.find((s) => s.id === p.session_id) || null,
        }))

      return {
        ...ev,
        sessions: evSessions,
        latihan: evLatihan,
        petugas: evPetugas,
      }
    })

    // Include active members list only for pengurus
    let activeMembers: any[] | undefined = undefined
    if (auth.isPengurus) {
      const { data: membersData } = await (admin as any)
        .from('profiles')
        .select('id, nama_lengkap, nama_panggilan, jenjang, asal_wilayah_teks, no_telepon')
        .eq('status', 'aktif')
        .order('nama_lengkap', { ascending: true })
      activeMembers = membersData || []
    }

    return NextResponse.json(
      {
        success: true,
        needs_migration: false,
        is_pengurus: auth.isPengurus,
        tahun,
        events: enrichedEvents,
        absensi,
        active_members: activeMembers,
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal memuat data latihan Misa Besar.' },
      { status: 500 }
    )
  }
}

