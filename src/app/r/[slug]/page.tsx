import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import ClientRedirect from "./client-redirect";

// Supabase client para o Server Component
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RedirectPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const search = await searchParams;

    // Capturar dados do Request
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "0.0.0.0";
    
    // Geo Headers (Vercel)
    const city = headersList.get("x-vercel-ip-city") ? decodeURIComponent(headersList.get("x-vercel-ip-city")!) : undefined;
    const country = headersList.get("x-vercel-ip-country");
    const region = headersList.get("x-vercel-ip-country-region");
    const postalCode = headersList.get("x-vercel-ip-postal-code");

    // --- FETCH FUNNEL SERVER SIDE ---
    let funnel = null;

    if (supabase) {
        try {
            // 1. Fetch Funnel Base
            const { data: funnelData } = await supabase
                .from("funnels")
                .select("*")
                .eq("slug", slug)
                .maybeSingle();

            if (funnelData) {
                // 2. Manual Join for Relations
                let pixelData = null;
                
                if (funnelData.pixel_id) {
                    const { data: p } = await supabase
                        .from("pixels")
                        .select("*")
                        .eq("id", funnelData.pixel_id)
                        .single();
                    pixelData = p;
                }

                funnel = {
                    ...funnelData,
                    pixels: pixelData,
                };
            }
        } catch (err) {
            console.error("[RedirectPage] Error fetching funnel:", err);
        }
    }

    return (
        <ClientRedirect
            slug={slug}
            ip={ip}
            geo={{
                city,
                country: country || undefined,
                region: region || undefined,
                postal_code: postalCode || undefined
            }}
            initialFunnelData={funnel}
            searchParams={search}
        />
    );
}
