import { SupabaseClient } from "@supabase/supabase-js";
import { sendCAPIEvent } from "@/lib/facebook-capi";

export class ConversionService {
    constructor(private supabase: SupabaseClient) {}

    /**
     * Processa conversão de Lead (Join): Registra evento e dispara CAPI
     */
    async processLeadConversion(
        visitorId: string,
        funnelId: string,
        telegramUserId: number,
        telegramUsername: string | undefined,
        telegramName: string | undefined,
        chatId: number | undefined,
        chatTitle: string | undefined,
        inviteName: string | undefined,
        source: string
    ) {
        try {
            // 1. Buscar dados do funil
            const { data: funnelData } = await this.supabase
                .from("funnels")
                .select("id, name, pixel_id")
                .eq("id", funnelId)
                .single();

            if (!funnelData) {
                console.log(`[Conversion] Funil ${funnelId} não encontrado para processar Lead.`);
                return;
            }

            // 2. Coletar Pixels (Robust Fetch)
            let pixelsToFire: any[] = [];

            // 2.1 Pixel Principal (Legacy)
            if (funnelData.pixel_id) {
                const { data: pixel } = await this.supabase
                    .from("pixels")
                    .select("id, pixel_id, access_token")
                    .eq("id", funnelData.pixel_id)
                    .single();
                if (pixel) pixelsToFire.push(pixel);
            }

            // 2.2 Multi-Pixels
            const { data: funnelPixels } = await this.supabase
                .from("funnel_pixels")
                .select("pixel_id")
                .eq("funnel_id", funnelId);

            if (funnelPixels && funnelPixels.length > 0) {
                const pixelIds = funnelPixels.map((fp: any) => fp.pixel_id);
                const { data: extraPixels } = await this.supabase
                    .from("pixels")
                    .select("id, pixel_id, access_token")
                    .in("id", pixelIds);
                if (extraPixels) pixelsToFire.push(...extraPixels);
            }

            // Deduplicate
            const uniquePixels = Array.from(new Map(pixelsToFire.map(p => [p.pixel_id, p])).values());
            console.log(`[Conversion] Total pixels para disparar (${source}): ${uniquePixels.length}`);

            // 3. Buscar Metadata (buscar múltiplos eventos para garantir que encontramos fbc/fbp)
            const { data: eventsList } = await this.supabase
                .from("events")
                .select("metadata")
                .eq("visitor_id", visitorId)
                .in("event_type", ["click", "pageview"])
                .order("created_at", { ascending: false })
                .limit(5);

            // Agregar metadata de múltiplos eventos
            let metadata: any = {};
            if (eventsList && eventsList.length > 0) {
                for (const ev of eventsList) {
                    const m = ev.metadata || {};
                    if (!metadata.fbc && m.fbc) metadata.fbc = m.fbc;
                    if (!metadata.fbp && m.fbp) metadata.fbp = m.fbp;
                    if (!metadata.user_agent && m.user_agent) metadata.user_agent = m.user_agent;
                    if (!metadata.ip_address && m.ip_address) metadata.ip_address = m.ip_address;
                    if (!metadata.city && m.city) metadata.city = m.city;
                    if (!metadata.region && m.region) metadata.region = m.region;
                    if (!metadata.country && m.country) metadata.country = m.country;
                    if (!metadata.postal_code && m.postal_code) metadata.postal_code = m.postal_code;
                    
                    if (!metadata.utm_source && m.utm_source) metadata.utm_source = m.utm_source;
                    if (!metadata.utm_medium && m.utm_medium) metadata.utm_medium = m.utm_medium;
                    if (!metadata.utm_campaign && m.utm_campaign) metadata.utm_campaign = m.utm_campaign;
                    if (!metadata.utm_content && m.utm_content) metadata.utm_content = m.utm_content;
                    if (!metadata.utm_term && m.utm_term) metadata.utm_term = m.utm_term;

                    if (metadata.fbc && metadata.fbp && metadata.utm_source) break;
                }
            }

            // 4. Registrar Evento JOIN (se não existir recentemente)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data: existingJoin } = await this.supabase
                .from("events")
                .select("id")
                .eq("visitor_id", visitorId)
                .eq("event_type", "join")
                .gte("created_at", fiveMinutesAgo)
                .maybeSingle();

            if (!existingJoin) {
                await this.supabase.from("events").insert({
                    funnel_id: funnelId,
                    visitor_id: visitorId,
                    event_type: "join",
                    metadata: {
                        ...metadata,
                        source: source,
                        telegram_user_id: telegramUserId,
                        telegram_username: telegramUsername,
                        telegram_name: telegramName,
                        chat_id: chatId,
                        chat_title: chatTitle,
                        invite_name: inviteName
                    }
                });
                console.log(`[Conversion] Evento JOIN registrado (${source})`);

                // 5. Enviar CAPI
                if (uniquePixels.length > 0) {
                    console.log(`[Conversion] Metadata para CAPI:`, {
                        fbc: metadata?.fbc || 'NÃO ENCONTRADO',
                        fbp: metadata?.fbp || 'NÃO ENCONTRADO',
                        visitor_id: visitorId
                    });
                    
                    const capiPromises = uniquePixels.map(async (pixelData: any) => {
                        if (!pixelData?.access_token || !pixelData?.pixel_id) return;
                        try {
                            return await sendCAPIEvent(
                                pixelData.access_token,
                                pixelData.pixel_id,
                                "Lead",
                                {
                                    fbc: metadata?.fbc || undefined,
                                    fbp: metadata?.fbp || undefined,
                                    user_agent: metadata?.user_agent,
                                    ip_address: metadata?.ip_address,
                                    external_id: visitorId,
                                    ct: metadata?.city,
                                    st: metadata?.region,
                                    country: metadata?.country,
                                    zp: metadata?.postal_code
                                },
                                {
                                    content_name: funnelData.name || "Lead"
                                },
                                {
                                    visitor_id: visitorId,
                                    funnel_id: funnelId
                                }
                            );
                        } catch (err) {
                            console.error(`[Conversion] Erro CAPI (${source}):`, err);
                        }
                    });
                    await Promise.all(capiPromises);
                    console.log(`[Conversion] CAPI processado para ${uniquePixels.length} pixels.`);
                }
            } else {
                console.log(`[Conversion] Evento JOIN já existe recentemente (${source}) - CAPI ignorado`);
            }
        } catch (error) {
            console.error(`[Conversion] Erro fatal em processLeadConversion:`, error);
        }
    }

    /**
     * Processa evento de Saída (Leave): Registra evento e dispara CAPI SaidaDeCanal
     */
    async processLeaveEvent(
        telegramUserId: number,
        chatId: number | undefined,
        chatTitle: string | undefined
    ) {
        // Buscar visitor_id vinculado a esse telegram_user_id
        const { data: linkData } = await this.supabase
            .from("visitor_telegram_links")
            .select("visitor_id, funnel_id")
            .eq("telegram_user_id", telegramUserId)
            .order("linked_at", { ascending: false })
            .limit(1)
            .single();

        if (linkData) {
            // 1. Buscar Pixels do Funil
            const { data: funnelData } = await this.supabase
                .from("funnels")
                .select(`
                    id, 
                    name, 
                    pixel_id,
                    pixels:pixels (id, pixel_id, access_token),
                    funnel_pixels (
                        pixels (id, pixel_id, access_token)
                    )
                `)
                .eq("id", linkData.funnel_id)
                .single();

            // Collect Pixels
            let pixelsToFire: any[] = [];
            if (funnelData) {
                const legacyPixel = funnelData.pixels as any;
                if (legacyPixel?.pixel_id) pixelsToFire.push(legacyPixel);

                if (funnelData.funnel_pixels && Array.isArray(funnelData.funnel_pixels)) {
                    funnelData.funnel_pixels.forEach((fp: any) => {
                        if (fp.pixels) pixelsToFire.push(fp.pixels);
                    });
                }
            }
            const uniquePixels = Array.from(new Map(pixelsToFire.map(p => [p.pixel_id, p])).values());

            // 2. Buscar Metadata
            const { data: eventsList } = await this.supabase
                .from("events")
                .select("metadata")
                .eq("visitor_id", linkData.visitor_id)
                .in("event_type", ["click", "pageview"])
                .order("created_at", { ascending: false })
                .limit(5);

            let metadata: any = {};
            if (eventsList && eventsList.length > 0) {
                for (const ev of eventsList) {
                    const m = ev.metadata || {};
                    if (!metadata.fbc && m.fbc) metadata.fbc = m.fbc;
                    if (!metadata.fbp && m.fbp) metadata.fbp = m.fbp;
                    if (!metadata.user_agent && m.user_agent) metadata.user_agent = m.user_agent;
                    if (!metadata.ip_address && m.ip_address) metadata.ip_address = m.ip_address;
                    if (!metadata.city && m.city) metadata.city = m.city;
                    if (!metadata.region && m.region) metadata.region = m.region;
                    if (!metadata.country && m.country) metadata.country = m.country;
                    if (!metadata.postal_code && m.postal_code) metadata.postal_code = m.postal_code;
                }
            }

            await this.supabase.from("events").insert({
                funnel_id: linkData.funnel_id,
                visitor_id: linkData.visitor_id,
                event_type: "leave",
                metadata: {
                    ...metadata,
                    source: "telegram_webhook",
                    telegram_user_id: telegramUserId,
                    chat_id: chatId,
                    chat_title: chatTitle
                }
            });
            console.log(`[Conversion] Evento LEAVE registrado`);

            // 3. Disparar CAPI "SaidaDeCanal"
            if (uniquePixels.length > 0) {
                console.log(`[Conversion] Disparando CAPI SaidaDeCanal para ${uniquePixels.length} pixels...`);

                const capiPromises = uniquePixels.map(async (pixelData) => {
                    if (!pixelData?.access_token || !pixelData?.pixel_id) return;

                    try {
                        return await sendCAPIEvent(
                            pixelData.access_token,
                            pixelData.pixel_id,
                            "SaidaDeCanal",
                            {
                                fbc: metadata.fbc || undefined,
                                fbp: metadata.fbp || undefined,
                                user_agent: metadata.user_agent || undefined,
                                ip_address: metadata.ip_address || undefined,
                                external_id: linkData.visitor_id,
                                ct: metadata.city || undefined,
                                st: metadata.region || undefined,
                                country: metadata.country || undefined,
                                zp: metadata.postal_code || undefined
                            },
                            {
                                content_name: funnelData?.name || "Saída de Canal"
                            },
                            {
                                visitor_id: linkData.visitor_id,
                                funnel_id: linkData.funnel_id!
                            }
                        );
                    } catch (err) {
                        console.error(`[Conversion] Erro envio CAPI Saída (Pixel ${pixelData.pixel_id}):`, err);
                    }
                });

                await Promise.all(capiPromises);
            }
        }
    }
}
