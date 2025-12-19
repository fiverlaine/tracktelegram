import { SupabaseClient } from "@supabase/supabase-js";

export class WelcomeService {
    constructor(private supabase: SupabaseClient) {}

    async sendWelcome(
        funnelId: string,
        botId: string,
        telegramUserId: number,
        chatId: number | undefined,
        firstName: string,
        username: string | undefined,
        inviteLinkToRevoke?: string,
        linkIdToUpdate?: string,
        visitorId?: string
    ) {
        try {
            // Buscar token do bot
            const { data: botData } = await this.supabase
                .from("telegram_bots")
                .select("bot_token")
                .eq("id", botId)
                .single();

            if (!botData?.bot_token) return;

            // 1. Revogar link (se fornecido)
            if (inviteLinkToRevoke && chatId) {
                try {
                    await fetch(`https://api.telegram.org/bot${botData.bot_token}/revokeChatInviteLink`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            invite_link: inviteLinkToRevoke
                        })
                    });
                    console.log(`[Welcome] Link de convite revogado.`);
                } catch (e) {
                    console.error(`[Welcome] Erro ao revogar link:`, e);
                }
            }

            // 2. Enviar Boas-vindas
            const { data: welcomeSettings } = await this.supabase
                .from("funnel_welcome_settings")
                .select("*")
                .eq("funnel_id", funnelId)
                .eq("is_active", true)
                .single();

            if (welcomeSettings) {
                let messageText = welcomeSettings.message_text || "";
                const userHandle = username ? `@${username}` : "";

                messageText = messageText.replace(/{first_name}/g, firstName).replace(/{username}/g, userHandle);

                const inlineKeyboard = welcomeSettings.buttons_config?.map((btn: any) => ([
                    { text: btn.label, url: btn.url }
                ])) || [];

                const response = await fetch(`https://api.telegram.org/bot${botData.bot_token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: telegramUserId,
                        text: messageText,
                        reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined
                    })
                });

                const result = await response.json();

                if (result.ok) {
                    // Marcar como enviado
                    if (linkIdToUpdate) {
                        await this.supabase
                            .from("visitor_telegram_links")
                            .update({ welcome_sent_at: new Date().toISOString() })
                            .eq("id", linkIdToUpdate);
                    } else if (visitorId) {
                        await this.supabase
                            .from("visitor_telegram_links")
                            .update({ welcome_sent_at: new Date().toISOString() })
                            .eq("visitor_id", visitorId)
                            .eq("funnel_id", funnelId);
                    }
                    console.log(`[Welcome] ✅ Mensagem enviada.`);
                } else {
                    console.error(`[Welcome] ❌ Erro ao enviar mensagem:`, result.description);
                }

                // Logar envio
                await this.supabase.from("telegram_message_logs").insert({
                    funnel_id: funnelId,
                    telegram_chat_id: telegramUserId.toString(),
                    telegram_user_name: username || firstName,
                    direction: 'outbound',
                    message_content: messageText,
                    status: result.ok ? 'sent' : 'failed',
                    error_message: result.ok ? null : result.description
                });
            }
        } catch (err) {
            console.error("[Welcome] Erro inesperado:", err);
        }
    }
}
