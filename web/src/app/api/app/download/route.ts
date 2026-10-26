import { NextResponse } from 'next/server'

export async function GET() {
  const downloadUrl = 'https://github.com/natalinonono/sidinar-regina/releases/latest/download/app-release.apk'
  return NextResponse.redirect(downloadUrl, 307)
}
