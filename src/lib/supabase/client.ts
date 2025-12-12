import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase environment variables are missing! Check .env.local");
        // Return a dummy client or throw a clearer error? 
        // Throwing is better so it fails fast but visibly.
        throw new Error("Supabase URL and Key are required.");
    }

    return createBrowserClient(supabaseUrl, supabaseKey, {
        cookieOptions: {
            maxAge: 365 * 24 * 60 * 60, // 1 year
            domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN, // Optional: share across subdomains if needed
            secure: process.env.NODE_ENV === 'production',
        }
    });
}
