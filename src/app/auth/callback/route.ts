import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.delete({ name, ...options })
                },
            },
        }
    )

    // Handle password recovery flow
    if (token_hash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery',
        })
        
        if (!error) {
            // Redirect to reset password page
            return NextResponse.redirect(`${origin}/auth/reset-password`)
        }
        
        // If error, redirect with error message
        return NextResponse.redirect(`${origin}/auth/reset-password?error_description=${encodeURIComponent(error.message)}`)
    }

    // Handle email confirmation or magic link
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

