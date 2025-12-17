import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ClientTracking from "./client-tracking";
import { createClient } from "@supabase/supabase-js";
import { generateTelegramInvite } from "@/lib/telegram-service";

// Supabase client para o Server Component
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    const postalCode = headersList.get("x-vercel-ip-postal-code");

    const vid = search.vid as string;

    // --- FETCH FUNNEL SERVER SIDE (Always) ---
    // Usamos Service Role se disponível para garantir acesso, ou Anon se não tiver
    // Isso evita problemas de RLS no client-side para visitantes anônimos
    const { data: funnel } = await supabase
        .from("funnels")
        .select(`
            *,
            pixels:pixels!funnels_pixel_id_fkey(*),
            telegram_bots:telegram_bots!funnels_bot_id_fkey(
                id,
                name,
                username,
                channel_link,
                bot_token,
                chat_id
            )
        `)
        .eq("slug", slug)
        .single();

    // --- MODO RÁPIDO (Server-Side Redirect) ---
    // Se já temos o Visitor ID (vindo da Landing Page), processamos tudo no servidor
    if (vid && funnel) {


        // 2. Rastrear Clique (Assíncrono - fire & forget)
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
            city, country, region, postal_code: postalCode
        };

        let destinationUrl: string | null = null;

        try {
            // OTIMIZAÇÃO: Execução em Paralelo (Banco de Dados + API Telegram)
            // Isso reduz o tempo de espera do usuário significativamente

            // 1. Promise do Log (Tratamos o erro aqui para não bloquear o redirecionamento)
            const logPromise = (async () => {
                try {
                    const { error } = await supabase.from("events").insert({
                        funnel_id: funnel.id,
                        visitor_id: vid,
                        event_type: "click",
                        metadata: clickData
                    });
                    if (error) console.error("[SSR] Erro ao logar clique:", error);
                } catch (err) {
                    console.error("[SSR] Erro de exceção ao logar clique:", err);
                }
            })();

            // 2. Promise do Convite (Essencial para o redirecionamento)
            const invitePromise = generateTelegramInvite({
                funnelId: funnel.id,
                visitorId: vid,
                bot: funnel.telegram_bots,
                createsJoinRequest: funnel.use_join_request
            });

            // 3. Aguardar as duas ao mesmo tempo
            const [, result] = await Promise.all([logPromise, invitePromise]);

            if (result?.invite_link) {
                destinationUrl = result.invite_link;
            }

        } catch (err) {
            console.error("[SSR] Erro crítico no processamento:", err);
        }

        // 4. Redirecionar Imediatamente (Fora do try/catch)
        if (destinationUrl) {
            redirect(destinationUrl);
        }
    }

    // --- MODO LEGADO / FALLBACK (Client-Side) ---
    // Se o usuário acessou direto sem 'vid', usamos o client-tracking para gerar o ID
    // Passamos o funnel pré-carregado para evitar fetch no cliente (que falharia com RLS restrito)
    return (
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
        />
    );
}
