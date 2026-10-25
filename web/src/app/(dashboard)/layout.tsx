import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      <Navbar profile={profile as any} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <footer className="w-full bg-surface-container-lowest border-t border-surface-container py-6 text-center text-xs text-on-surface-variant">
        <p>
          &copy; 2026 SiDinar Regina • Sistem Informasi Putra-Putri Altar Paroki Santa Perawan Maria Regina Purbowardayan
        </p>
      </footer>
    </div>
  )
}
