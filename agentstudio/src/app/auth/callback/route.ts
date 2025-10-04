import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    await supabase.auth.exchangeCodeForSession(code)
    
    // Verifica se l'utente ha già completato il setup
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('studio_name')
        .eq('id', user.id)
        .single()
      
      // Se ha già il profilo, vai alla dashboard
      // Altrimenti vai al setup
      if (profile?.studio_name) {
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/setup', requestUrl.origin))
}