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

    // --- GTM SCRIPT ---
    const gtmScript = (
        <script
            dangerouslySetInnerHTML={{
                __html: `
                (function(w,d,s,l,i){
                    w[l]=w[l]||[];
                    w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
                    var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                    j.async=true; 
                    j.src='https://tracktelegram.vercel.app/api/tracking-script.js?id=c62d7b2c-53eb-44aa-9885-b9d7ee402abc';
                    f.parentNode.insertBefore(j,f);
                })(window,document,'script','trackGramLayer','c62d7b2c-53eb-44aa-9885-b9d7ee402abc');
                `
            }}
        />
    );

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

            // 2. Promise do Convite (Tenta Pool primeiro, depois On-Demand)
            const invitePromise = (async () => {
                // Tentar pegar do Pool
                const { data: poolLink } = await supabase
                    .from("invite_link_pool")
                    .select("id, invite_link, invite_name")
                    .eq("funnel_id", funnel.id)
                    .eq("status", "available")
                    .limit(1)
                    .maybeSingle();

                if (poolLink) {
                    // Marcar como usado
                    await supabase
                        .from("invite_link_pool")
                        .update({ status: 'used', used_at: new Date().toISOString() })
                        .eq("id", poolLink.id);

                    // Salvar vínculo
                    await supabase.from("visitor_telegram_links").upsert({
                        visitor_id: vid,
                        funnel_id: funnel.id,
                        bot_id: funnel.telegram_bots.id,
                        telegram_user_id: 0,
                        metadata: {
                            invite_link: poolLink.invite_link,
                            invite_name: poolLink.invite_name,
                            generated_at: new Date().toISOString(),
                            type: "pool_invite",
                            source: "ssr_pool"
                        }
                    }, { onConflict: "visitor_id,telegram_user_id" });

                    return { invite_link: poolLink.invite_link };
                }

                // Fallback: Gerar On-Demand
                return generateTelegramInvite({
                    funnelId: funnel.id,
                    visitorId: vid,
                    bot: funnel.telegram_bots,
                    createsJoinRequest: funnel.use_join_request
                });
            })();

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
        <>
            {gtmScript}
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
        </>
    );
}
