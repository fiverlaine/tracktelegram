import { SupabaseClient } from "@supabase/supabase-js";

export class MessageHandler {
    constructor(private supabase: SupabaseClient) {}

    async handleMessage(update: any, botId: string) {
        const message = update.message;
        if (!message?.text) return;

        const text = message.text;
        const telegramUserId = message.from.id;
        const telegramUsername = message.from.username;
        const isPrivate = message.chat.type === "private";

        // 1. Handle /start command (Deep Linking) - Fluxo Legacy
        if (text.startsWith("/start ")) {
            await this.handleStartCommand(message, botId);
            return;
        }

        // 2. Handle Generic Text Messages (Inbound) - Apenas DM
        if (isPrivate && !text.startsWith("/")) {
            await this.handleGenericMessage(message);
        }
    }

    private async handleStartCommand(message: any, botId: string) {
        const args = message.text.split(" ");
        if (args.length <= 1) return;

        const visitorId = args[1].trim();
        const telegramUserId = message.from.id;
        const telegramUsername = message.from.username;

        console.log(`[MessageHandler] /start - Linking Visitor ${visitorId} to Telegram ID ${telegramUserId}`);

        const { data: botData } = await this.supabase
            .from("funnels")
            .select(`
                id,
                telegram_bots (
                    bot_token,
                    channel_link
                )
            `)
            .eq("bot_id", botId)
            .single();

        await this.supabase.from("visitor_telegram_links").upsert({
            visitor_id: visitorId,
            telegram_user_id: telegramUserId,
            telegram_username: telegramUsername,
            bot_id: botId,
            funnel_id: botData?.id,
            linked_at: new Date().toISOString()
        }, { onConflict: 'visitor_id' });

        const botRelation: any = botData?.telegram_bots;
        const botToken = Array.isArray(botRelation) ? botRelation[0]?.bot_token : botRelation?.bot_token;
        const channelLink = Array.isArray(botRelation) ? botRelation[0]?.channel_link : botRelation?.channel_link;

        if (botToken && channelLink) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: telegramUserId,
                    text: "🚀 Tudo pronto! Clique abaixo para entrar no grupo VIP:",
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "👉 ENTRAR NO GRUPO AGORA", url: channelLink }
                        ]]
                    }
                })
            });
        }
    }

    private async handleGenericMessage(message: any) {
        const telegramUserId = message.from.id;
        const telegramUsername = message.from.username;
        const messageText = message.text;

        // 1. Tentar descobrir o Funnel ID pelo vínculo existente
        const { data: linkData } = await this.supabase
            .from("visitor_telegram_links")
            .select("funnel_id")
            .eq("telegram_user_id", telegramUserId)
            .order("linked_at", { ascending: false })
            .limit(1)
            .single();

        const funnelId = linkData?.funnel_id;

        // 2. Salvar log APENAS se o usuário estiver vinculado a um funil (Trackeado)
        if (funnelId) {
            console.log(`[MessageHandler] Mensagem recebida de ${telegramUserId} (Trackeado): ${messageText}`);
            await this.supabase.from("telegram_message_logs").insert({
                funnel_id: funnelId,
                telegram_chat_id: telegramUserId.toString(),
                telegram_user_name: telegramUsername || message.from.first_name,
                direction: 'inbound',
                message_content: messageText,
                status: 'received'
            });
        } else {
            console.log(`[MessageHandler] Mensagem ignorada de ${telegramUserId} (Não trackeado)`);
        }
    }
}
