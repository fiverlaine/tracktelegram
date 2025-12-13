import { createClient } from "@supabase/supabase-js";

/**
 * Cria cliente Supabase com validação de variáveis de ambiente
 */
export function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase credentials missing");
    }

    return createClient(supabaseUrl, supabaseKey);
}

interface GenerateInviteParams {
    funnelId: string;
    visitorId: string;
    bot?: any;
    createsJoinRequest?: boolean;
}

/**
 * Core Logic: Gerar link de convite único do Telegram
 */
export async function generateTelegramInvite({ funnelId, visitorId, bot, createsJoinRequest = false }: GenerateInviteParams) {
    const supabase = getSupabaseClient();
    let telegramBot = bot;

    // 1. Se não passou o bot, buscar do funil
    if (!telegramBot) {
        const { data: funnel, error: funnelError } = await supabase
            .from("funnels")
            .select(`
                id,
                name,
                telegram_bots (
                    id,
                    bot_token,
                    chat_id,
                    channel_link
                )
            `)
            .eq("id", funnelId)
            .single();

        if (funnelError || !funnel) {
            throw new Error("Funil não encontrado");
        }
        telegramBot = funnel.telegram_bots;
    }

    if (!telegramBot?.bot_token) {
        throw new Error("Bot não configurado para este funil");
    }

    // 2. Se não tiver chat_id, usar link estático
    if (!telegramBot?.chat_id) {
        if (telegramBot?.channel_link) {
            return {
                invite_link: telegramBot.channel_link,
                is_dynamic: false,
                message: "Link estático (chat_id não configurado)"
            };
        }
        throw new Error("Chat ID e Link do Canal não configurados");
    }

    // 3. Gerar Invite Link na API do Telegram
    try {
        const inviteName = `v_${visitorId.substring(0, 28)}`;

        const payload: any = {
            chat_id: telegramBot.chat_id,
            name: inviteName,
            expire_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h
        };

        if (createsJoinRequest) {
            payload.creates_join_request = true;
            // member_limit não pode ser usado com creates_join_request
        } else {
            payload.member_limit = 1;
        }

        const telegramResponse = await fetch(
            `https://api.telegram.org/bot${telegramBot.bot_token}/createChatInviteLink`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }
        );

        const telegramData = await telegramResponse.json();

        if (!telegramData.ok) {
            console.error("Erro Telegram API:", telegramData);
            // Fallback para estático
            if (telegramBot.channel_link) {
                return {
                    invite_link: telegramBot.channel_link,
                    is_dynamic: false,
                    error_detail: telegramData.description,
                    message: "Fallback estático após erro na API"
                };
            }
            throw new Error(`Erro API Telegram: ${telegramData.description}`);
        }

        const inviteLink = telegramData.result.invite_link;

        // 4. Salvar mapeamento
        await supabase.from("visitor_telegram_links").upsert({
            visitor_id: visitorId,
            funnel_id: funnelId,
            bot_id: telegramBot.id,
            telegram_user_id: 0,
            metadata: {
                invite_link: inviteLink,
                invite_name: inviteName,
                generated_at: new Date().toISOString(),
                type: "dynamic_invite"
            }
        }, { onConflict: "visitor_id,telegram_user_id" });

        return {
            invite_link: inviteLink,
            is_dynamic: true
        };

    } catch (err) {
        console.error("Erro ao gerar link:", err);
        // Último recurso: usar link estático se disponível
        if (telegramBot?.channel_link) {
            return {
                invite_link: telegramBot.channel_link,
                is_dynamic: false
            };
        }
        throw err;
    }
}
