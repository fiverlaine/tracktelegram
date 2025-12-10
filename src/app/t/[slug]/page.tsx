import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ClientTracking from "./client-tracking";
import { createClient } from "@supabase/supabase-js";
import { generateTelegramInvite } from "@/lib/telegram-service";

// Supabase client para o Server Component
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    const vid = search.vid as string;

    // --- MODO RÁPIDO (Server-Side Redirect) ---
    // Se já temos o Visitor ID (vindo da Landing Page), processamos tudo no servidor
    if (vid) {
        console.log(`[SSR] Processando acesso rápido para VID: ${vid}`);
        
        // 1. Buscar Funil
        const { data: funnel } = await supabase
            .from("funnels")
            .select("*, telegram_bots(*)")
            .eq("slug", slug)
            .single();

        if (funnel) {
            // 2. Rastrear Clique (Assíncrono - fire & forget)
            // Não usamos 'await' para não bloquear o redirect, mas em serverless
            // é ideal usar await leve ou context.waitUntil (se disponível)
            // Aqui vamos usar await rápido pois precisamos garantir o insert
            const clickData = {
                timestamp: new Date().toISOString(),
                fbclid: search.fbclid,
                fbc: search.fbc,
                fbp: search.fbp,
                user_agent: userAgent,
                page_url: `https://${headersList.get("host")}/t/${slug}`,
                utm_source: search.utm_source,
                utm_medium: search.utm_medium,
                utm_campaign: search.utm_campaign,
                utm_content: search.utm_content,
                utm_term: search.utm_term,
                ip_address: ip,
                city, country, region
            };

            let destinationUrl: string | null = null;
            
            try {
                // Registrar clique
                await supabase.from("events").insert({
                    funnel_id: funnel.id,
                    visitor_id: vid,
                    event_type: "click", // Consideramos 'click' pois é a transição para o canal
                    metadata: clickData
                });

                // 3. Gerar Link Telegram
                const result = await generateTelegramInvite({
                    funnelId: funnel.id,
                    visitorId: vid,
                    bot: funnel.telegram_bots
                });

                if (result?.invite_link) {
                    destinationUrl = result.invite_link;
                }

            } catch (err) {
                console.error("[SSR] Erro no processamento:", err);
            }

            // 4. Redirecionar Imediatamente (Fora do try/catch)
            if (destinationUrl) {
                console.log(`[SSR] Redirecionando para: ${destinationUrl}`);
                redirect(destinationUrl);
            }
        }
    }

    // --- MODO LEGADO / FALLBACK (Client-Side) ---
    // Se o usuário acessou direto sem 'vid', usamos o client-tracking para gerar o ID
    return (
        <ClientTracking 
            slug={slug} 
            ip={ip} 
            geo={{
                city,
                country: country || undefined,
                region: region || undefined
            }}
        />
    );
}
