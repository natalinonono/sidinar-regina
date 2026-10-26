import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = cookies()
  let bearerToken: string | null = null

  try {
    const headersList = headers()
    const authHeader = headersList.get('authorization') || headersList.get('Authorization')
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      bearerToken = authHeader.substring(7).trim()
    }
  } catch {
    // ignore
  }

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
      global: {
        headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {},
      },
    }
  )

  if (bearerToken) {
    const originalGetUser = client.auth.getUser.bind(client.auth)
    client.auth.getUser = async (jwt?: string) => {
      return originalGetUser(jwt || bearerToken!)
    }
  }

  return client
}

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
