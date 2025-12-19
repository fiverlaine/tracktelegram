import { SupabaseClient } from "@supabase/supabase-js";

export interface AttributionResult {
    visitorId: string | null;
    funnelId: string | null;
    linkData: any | null;
    method: "invite_link" | "telegram_user_id" | "recent_click" | null;
}

export class AttributionService {
    constructor(private supabase: SupabaseClient) {}

    /**
     * Tenta encontrar o visitor_id usando 3 métodos em cascata:
     * 1. Invite Link (v_{visitor_id} ou pool_{uuid})
     * 2. Telegram User ID (se já vinculado)
     * 3. Click Recente (fallback temporal)
     */
    async findVisitor(
        inviteName: string | undefined,
        telegramUserId: number | undefined,
        botId: string
    ): Promise<AttributionResult> {
        let visitorId: string | null = null;
        let funnelId: string | null = null;
        let linkData: any = null;
        let method: AttributionResult["method"] = null;

        // MÉTODO 1: Extrair visitor_id do invite_link.name (Fluxo Direto)
        if (inviteName) {
            // CASO A: Link Gerado On-Demand (v_{visitor_id})
            if (inviteName.startsWith("v_")) {
                const partialVisitorId = inviteName.substring(2); // Remove "v_"
                console.log(`[Attribution] Buscando por visitor_id que começa com: ${partialVisitorId}`);

                const { data } = await this.supabase
                    .from("visitor_telegram_links")
                    .select("id, visitor_id, funnel_id, metadata, welcome_sent_at")
                    .like("visitor_id", `${partialVisitorId}%`)
                    .order("linked_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    linkData = data;
                    visitorId = data.visitor_id;
                    funnelId = data.funnel_id;
                    method = "invite_link";
                    console.log(`[Attribution] Encontrado visitor_id (On-Demand): ${visitorId}`);
                }
            }
            // CASO B: Link do Pool (pool_{uuid})
            else if (inviteName.startsWith("pool_")) {
                console.log(`[Attribution] Detectado link do Pool: ${inviteName}`);

                const { data } = await this.supabase
                    .from("visitor_telegram_links")
                    .select("id, visitor_id, funnel_id, metadata, welcome_sent_at")
                    .eq("metadata->>invite_name", inviteName)
                    .order("linked_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    linkData = data;
                    visitorId = data.visitor_id;
                    funnelId = data.funnel_id;
                    method = "invite_link";
                    console.log(`[Attribution] Encontrado visitor_id (Pool): ${visitorId}`);
                }
            }
        }

        // MÉTODO 2: Fallback - buscar por telegram_user_id
        if (!visitorId && telegramUserId) {
            console.log(`[Attribution] Tentando fallback por telegram_user_id: ${telegramUserId}`);
            const { data } = await this.supabase
                .from("visitor_telegram_links")
                .select("visitor_id, funnel_id, bot_id, welcome_sent_at, id, metadata")
                .eq("telegram_user_id", telegramUserId)
                .order("linked_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                // Verificar se o bot_id corresponde
                if (!botId || data.bot_id === botId) {
                    visitorId = data.visitor_id;
                    funnelId = data.funnel_id;
                    linkData = data;
                    method = "telegram_user_id";
                    console.log(`[Attribution] ✅ Fallback: encontrado via telegram_user_id`);
                } else {
                    console.log(`[Attribution] ⚠️ Registro encontrado mas bot_id não corresponde (${data.bot_id} != ${botId})`);
                }
            }
        }

        // MÉTODO 3: Fallback - buscar click mais recente sem vínculo
        if (!visitorId) {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            console.log(`[Attribution] Tentando fallback por click recente (últimos 10 minutos)...`);

            const { data: recentClicks } = await this.supabase
                .from("events")
                .select("visitor_id, funnel_id, created_at")
                .eq("event_type", "click")
                .gte("created_at", tenMinutesAgo)
                .order("created_at", { ascending: false })
                .limit(10);

            if (recentClicks && recentClicks.length > 0) {
                // Buscar funis do bot_id atual
                const { data: botFunnels } = await this.supabase
                    .from("funnels")
                    .select("id")
                    .eq("bot_id", botId);

                const botFunnelIds = botFunnels?.map(f => f.id) || [];

                // Filtrar clicks que pertencem a funis deste bot
                const relevantClicks = recentClicks.filter(click =>
                    click.funnel_id && botFunnelIds.includes(click.funnel_id)
                );

                if (relevantClicks.length > 0) {
                    // Pegar o click mais recente que não tem join ainda
                    for (const click of relevantClicks) {
                        const { data: existingJoin } = await this.supabase
                            .from("events")
                            .select("id")
                            .eq("visitor_id", click.visitor_id)
                            .eq("event_type", "join")
                            .limit(1)
                            .maybeSingle();

                        if (!existingJoin) {
                            visitorId = click.visitor_id;
                            funnelId = click.funnel_id;
                            method = "recent_click";
                            console.log(`[Attribution] ✅ Fallback timing: usando click recente - visitor_id: ${visitorId}`);
                            break;
                        }
                    }
                }
            }
        }

        return { visitorId, funnelId, linkData, method };
    }

    /**
     * Vincula ou atualiza o telegram_user_id ao visitor_id
     */
    async linkUser(
        visitorId: string,
        funnelId: string,
        botId: string,
        telegramUserId: number,
        telegramUsername: string | undefined,
        telegramFullName: string,
        metadata: any
    ) {
        const { data: existingLink } = await this.supabase
            .from("visitor_telegram_links")
            .select("id, telegram_user_id, metadata")
            .eq("visitor_id", visitorId)
            .eq("funnel_id", funnelId)
            .maybeSingle();

        if (existingLink) {
            // Atualizar se não tiver telegram_user_id ou se for update de dados
            await this.supabase
                .from("visitor_telegram_links")
                .update({
                    telegram_user_id: telegramUserId,
                    telegram_username: telegramUsername,
                    linked_at: new Date().toISOString(),
                    metadata: {
                        ...(existingLink.metadata || {}),
                        ...metadata,
                        telegram_name: telegramFullName
                    }
                })
                .eq("id", existingLink.id);
            return existingLink.id;
        } else {
            // Criar novo
            const { data, error } = await this.supabase
                .from("visitor_telegram_links")
                .upsert({
                    visitor_id: visitorId,
                    funnel_id: funnelId,
                    bot_id: botId,
                    telegram_user_id: telegramUserId,
                    telegram_username: telegramUsername,
                    linked_at: new Date().toISOString(),
                    metadata: {
                        ...metadata,
                        telegram_name: telegramFullName
                    }
                }, { onConflict: "visitor_id,telegram_user_id" })
                .select()
                .single();
            
            if (error) console.error("[Attribution] Erro ao criar link:", error);
            return data?.id;
        }
    }
}
