import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ClientTracking from "./client-tracking";
import { createClient } from "@supabase/supabase-js";

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

export default async function TrackingPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const search = await searchParams;

    // Capturar dados do Request
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "0.0.0.0";
    const userAgent = headersList.get("user-agent") || "";

    // Geo Headers (Vercel)
    const city = headersList.get("x-vercel-ip-city") ? decodeURIComponent(headersList.get("x-vercel-ip-city")!) : undefined;
    const country = headersList.get("x-vercel-ip-country");
    const region = headersList.get("x-vercel-ip-country-region");
    const postalCode = headersList.get("x-vercel-ip-postal-code");

    const vid = search.vid as string;

    // --- FETCH FUNNEL SERVER SIDE (Always) ---
    // Usamos Service Role se disponível para garantir acesso, ou Anon se não tiver
    // Isso evita problemas de RLS no client-side para visitantes anônimos

    let funnel = null;

    if (supabase) {
        try {
            console.log(`[TrackingPage] Fetching funnel for slug: ${slug}`);
            const { data, error } = await supabase
                .from("funnels")
                .select(`
                    *,
                    pixels(*),
                    telegram_bots(*)
                `)
                .eq("slug", slug)
                .maybeSingle();

            if (error) {
                console.error("[TrackingPage] Supabase Error fetching funnel:", error);
            } else {
                if (!data) {
                    console.warn(`[TrackingPage] Funnel not found for slug: ${slug}`);
                } else {
                    console.log(`[TrackingPage] Funnel found: ${data.id}`);
                }
                funnel = data;
            }
        } catch (err) {
            console.error("[TrackingPage] Unexpected error fetching funnel:", err);
        }
    } else {
        console.error("[TrackingPage] Supabase client not initialized (missing env vars). Check SUPABASE_SERVICE_ROLE_KEY.");
    }

    // --- MODO CLIENT-SIDE REDIRECT (Para mostrar UI de Loading) ---
    // Não fazemos redirect no servidor para permitir que o componente ClientTracking
    // renderize a tela de "Redirecionando" enquanto processa.

    // Injetar Logs no Console (Estilo Concorrente)
    const consoleLogScript = (
        <script
            dangerouslySetInnerHTML={{
                __html: `
                (function() {
                    if (window.__teletrack_branded) return;
                    window.__teletrack_branded = true;
                    console.log("%c████████╗██████╗  █████╗  ██████╗██╗  ██╗███████╗ █████╗ ████████╗██╗  ██╗███████╗██████╗ \\n╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗╚══██╔══╝██║  ██║██╔════╝██╔══██╗\\n   ██║   ██████╔╝███████║██║     █████╔╝ █████╗  ███████║   ██║   ███████║█████╗  ██████╔╝\\n   ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██║   ██║   ██╔══██║██╔══╝  ██╔══██╗\\n   ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗██║     ██║  ██║   ██║   ██║  ██║███████╗██║  ██║\\n   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝", "color: #4F46E5; font-family: monospace; font-size: 10px;");
                    console.log("%c🚀 Este site usa TeleTrack - Marketing Attribution & Analytics", "color: #4F46E5; font-size: 14px; font-weight: bold; padding: 8px 0;");
                    console.log("%c📊 Plataforma completa de atribuição de marketing para Telegram", "color: #6B7280; font-size: 12px;");
                    console.log("%c🔗 Conheça mais em: https://teletrack.vercel.app", "color: #10B981; font-size: 12px; font-weight: bold;");
                    console.log("%c─────────────────────────────────────────────────────", "color: #E5E7EB;");
                })();
                `
            }}
        />
    );

    return (
        <>
            {consoleLogScript}
            <ClientTracking
                slug={slug}
                ip={ip}
                geo={{
                    city,
                    country: country || undefined,
                    region: region || undefined,
                    postal_code: postalCode || undefined
                }}
                initialFunnelData={funnel}
                visitorId={vid} // Passamos o VID se existir
                searchParams={search} // Passamos os params para o cliente usar
            />
        </>
    );
}
