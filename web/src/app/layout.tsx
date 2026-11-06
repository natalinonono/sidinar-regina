import type { Metadata } from 'next'
import './globals.css'
import { SecurityConsoleNotice } from '@/components/SecurityConsoleNotice'

export const metadata: Metadata = {
  title: 'SiDinar Regina - Sistem Digital Misdinar Paroki Purbowardayan',
  description: 'Platform Resmi Manajemen & Presensi Putra-Putri Altar Paroki Santa Perawan Maria Regina Purbowardayan Surakarta',
  icons: {
    icon: '/logo-misdinar.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="min-h-screen bg-background text-on-surface antialiased flex flex-col">
        <SecurityConsoleNotice />
        {children}
      </body>
    </html>
  )
}
