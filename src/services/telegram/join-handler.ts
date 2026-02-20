import { SupabaseClient } from "@supabase/supabase-js";
import { AttributionService } from "./attribution-service";
import { ConversionService } from "./conversion-service";
import { WelcomeService } from "./welcome-service";
import { PushcutService } from "./pushcut-service";

export class JoinHandler {
    private attributionService: AttributionService;
    private conversionService: ConversionService;
    private welcomeService: WelcomeService;
    private pushcutService: PushcutService;

    constructor(private supabase: SupabaseClient) {
        this.attributionService = new AttributionService(supabase);
        this.conversionService = new ConversionService(supabase);
        this.welcomeService = new WelcomeService(supabase);
        this.pushcutService = new PushcutService(supabase);
    }

    async handleChatMember(update: any, botId: string) {
        const chatMember = update.chat_member || update.my_chat_member;
        if (!chatMember) return;

        const newStatus = chatMember.new_chat_member?.status;
        const oldStatus = chatMember.old_chat_member?.status;
        const telegramUserId = chatMember.new_chat_member?.user?.id || chatMember.from?.id;
        const telegramUsername = chatMember.new_chat_member?.user?.username || chatMember.from?.username;
        const telegramFirstName = chatMember.new_chat_member?.user?.first_name || chatMember.from?.first_name || "";
        const telegramLastName = chatMember.new_chat_member?.user?.last_name || chatMember.from?.last_name || "";
        const telegramFullName = `${telegramFirstName} ${telegramLastName}`.trim();
        const chatId = chatMember.chat?.id;
        const chatTitle = chatMember.chat?.title;
        const inviteLink = chatMember.invite_link;
        const inviteName = inviteLink?.name;

        const isJoin = ['member', 'creator', 'administrator'].includes(newStatus) &&
            !['member', 'creator', 'administrator'].includes(oldStatus);

        const isLeave = ['left', 'kicked'].includes(newStatus) &&
            ['member', 'creator', 'administrator'].includes(oldStatus);

        if (isJoin) {
            console.log(`[JoinHandler] User ${telegramUserId} JOINED! invite_name: ${inviteName || 'N/A'}`);

            // 1. Atribuição (Encontrar Visitor ID)
            const attribution = await this.attributionService.findVisitor(inviteName, telegramUserId, botId);
            
            let visitorId = attribution.visitorId;
            let funnelId = attribution.funnelId;
            let linkData = attribution.linkData;

            // 2. Vincular User ID se necessário
            if (visitorId && funnelId && telegramUserId) {
                const linkId = await this.attributionService.linkUser(
                    visitorId,
                    funnelId,
                    botId,
                    telegramUserId,
                    telegramUsername,
                    telegramFullName,
                    {
                        linked_via: attribution.method || "chat_member_fallback",
                        chat_id: chatId,
                        chat_title: chatTitle
                    }
                );
                // Atualizar linkData com o ID correto se foi criado/atualizado
                if (linkId && linkData) linkData.id = linkId;
            } else {
                // Unattributed Join
                console.log(`[JoinHandler] Unattributed join for user ${telegramUserId}`);
                await this.supabase.from("events").insert({
                    funnel_id: null,
                    visitor_id: `unknown_${telegramUserId}`,
                    event_type: "join",
                    metadata: {
                        source: "telegram_webhook",
                        telegram_user_id: telegramUserId,
                        telegram_username: telegramUsername,
                        chat_id: chatId,
                        chat_title: chatTitle,
                        unattributed: true
                    }
                });
            }

            // 3. Lógica de Notificação (com Fallback Robusto)
            let notifyFunnelId = funnelId;
            
            // Se atribuição falhou, tentar encontrar funnelId histórico para notificação
            if (!notifyFunnelId && telegramUserId) {
                const { data: historicalLink } = await this.supabase
                    .from("visitor_telegram_links")
                    .select("funnel_id")
                    .eq("telegram_user_id", telegramUserId)
                    .order("linked_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (historicalLink?.funnel_id) {
                    notifyFunnelId = historicalLink.funnel_id;
                    console.log(`[JoinHandler] Usando funnel_id histórico para notificação: ${notifyFunnelId}`);
                }
            }

            if (notifyFunnelId) {
                // Enviar notificação Pushcut para membro entrou (member_join)
                // Usamos member_join pois é a entrada confirmada no grupo
                this.pushcutService.notifyMemberJoin(
                    notifyFunnelId,
                    telegramUserId,
                    telegramUsername,
                    telegramFullName,
                    chatTitle
                ).catch(err => console.error('[JoinHandler] Pushcut notification error:', err));
            }

            // 4. Processar Conversão (CAPI)
            if (visitorId && funnelId) {
                await this.conversionService.processLeadConversion(
                    visitorId,
                    funnelId,
                    telegramUserId,
                    telegramUsername,
                    telegramFullName,
                    chatId,
                    chatTitle,
                    inviteName,
                    "chat_member_update"
                );

                // 4. Enviar Boas-vindas
                // Verificar se já foi enviado
                let welcomeSentAt = linkData?.welcome_sent_at;
                
                // Se não tiver linkData atualizado, buscar novamente
                if (!welcomeSentAt && visitorId) {
                    const { data } = await this.supabase
                        .from("visitor_telegram_links")
                        .select("welcome_sent_at")
                        .eq("visitor_id", visitorId)
                        .eq("funnel_id", funnelId)
                        .maybeSingle();
                    welcomeSentAt = data?.welcome_sent_at;
                }

                if (!welcomeSentAt) {
                    await this.welcomeService.sendWelcome(
                        funnelId,
                        botId,
                        telegramUserId,
                        chatId,
                        telegramFirstName,
                        telegramUsername,
                        inviteLink?.invite_link,
                        linkData?.id,
                        visitorId
                    );
                } else {
                    console.log(`[JoinHandler] Boas-vindas já enviada em ${welcomeSentAt}`);
                }
            }
        }

        if (isLeave) {
            console.log(`[JoinHandler] User ${telegramUserId} LEFT!`);
            await this.conversionService.processLeaveEvent(telegramUserId, chatId, chatTitle);

            // Enviar notificação Pushcut para saída
            // Primeiro buscar o funnel_id a partir do telegram_user_id
            const { data: linkData } = await this.supabase
                .from("visitor_telegram_links")
                .select("funnel_id")
                .eq("telegram_user_id", telegramUserId)
                .order("linked_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (linkData?.funnel_id) {
                this.pushcutService.notifyMemberLeave(
                    linkData.funnel_id,
                    telegramUserId,
                    chatTitle
                ).catch(err => console.error('[JoinHandler] Pushcut leave notification error:', err));
            }
        }
    }

    async handleJoinRequest(update: any, botId: string) {
        const request = update.chat_join_request;
        if (!request) return;

        const telegramUserId = request.from?.id;
        const inviteLink = request.invite_link;
        const inviteName = inviteLink?.name;
        const chatId = request.chat?.id;
        const chatTitle = request.chat?.title;
        const telegramUsername = request.from?.username;
        const telegramFirstName = request.from?.first_name || "";
        const telegramLastName = request.from?.last_name || "";
        const telegramFullName = `${telegramFirstName} ${telegramLastName}`.trim();

        console.log(`[JoinHandler] Join Request recebido de ${telegramUserId}, invite: ${inviteName}`);

        const { data: botData } = await this.supabase
            .from("telegram_bots")
            .select("bot_token, chat_id")
            .eq("id", botId)
            .single();

        if (!botData?.bot_token) {
            console.error(`[JoinHandler] Bot não encontrado: ${botId}`);
            return;
        }

        const approvalChatId = chatId || botData.chat_id;
        
        if (!approvalChatId) {
            console.error(`[JoinHandler] Chat ID não disponível para aprovação`);
            return;
        }

        const isTrackedLink = inviteName && (inviteName.startsWith("v_") || inviteName.startsWith("pool_"));

        if (!isTrackedLink) {
            // Aprovar IMEDIATAMENTE se for um link não trackeado
            try {
                const approveResponse = await fetch(`https://api.telegram.org/bot${botData.bot_token}/approveChatJoinRequest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: approvalChatId, user_id: telegramUserId })
                });
                const approveResult = await approveResponse.json();
                if (approveResult.ok) {
                    console.log(`[JoinHandler] ✅ Auto-aprovado INSTANTÂNEO user ${telegramUserId} no chat ${approvalChatId}`);
                } else {
                    console.error(`[JoinHandler] ❌ Erro ao aprovar:`, approveResult.description);
                }
            } catch (e) {
                console.error(`[JoinHandler] ❌ Erro ao aprovar:`, e);
            }
            return;
        }

        // Se for um link de visitante (TrackGram), devemos processar o envio de boas-vindas
        // ANTES de aprovar o Join Request, pois a API do Telegram proíbe envio de msg privada
        // após a solicitação ser aprovada (se o user não deu /start).
        this.processJoinRequestBackground(
            botId,
            botData.bot_token,
            approvalChatId,
            telegramUserId,
            telegramUsername,
            telegramFirstName,
            telegramFullName,
            inviteName,
            inviteLink?.invite_link,
            chatTitle
        ).catch(err => console.error('[JoinHandler] Background processing error:', err));
    }

    /**
     * Processa atribuição, conversão, welcome, e aprovação
     */
    private async processJoinRequestBackground(
        botId: string,
        botToken: string,
        chatId: number,
        telegramUserId: number,
        telegramUsername: string | undefined,
        telegramFirstName: string,
        telegramFullName: string,
        inviteName: string,
        inviteLinkUrl: string | undefined,
        chatTitle: string | undefined
    ) {
        try {
            // 1. Atribuição (encontrar visitor_id)
            const attribution = await this.attributionService.findVisitor(inviteName, telegramUserId, botId);
            const visitorId = attribution.visitorId;
            const funnelId = attribution.funnelId;
            const linkData = attribution.linkData;

            if (!visitorId || !funnelId) {
                console.log(`[JoinHandler] Background: Sem atribuição para user ${telegramUserId}`);
                await this.approveUser(botToken, chatId, telegramUserId);
                return;
            }

            // ⚠️ IMPORTANTE PARA A API DO TELEGRAM:
            // Enviar Boas-vindas ANTES da aprovação
            let welcomeSentAt = linkData?.welcome_sent_at;
            if (!welcomeSentAt) {
                await this.welcomeService.sendWelcome(
                    funnelId,
                    botId,
                    telegramUserId,
                    chatId,
                    telegramFirstName,
                    telegramUsername,
                    inviteLinkUrl,
                    linkData?.id || undefined,
                    visitorId
                );
            }

            // 3. APROVAR A REQUISIÇÃO (Após enviar mensagem)
            await this.approveUser(botToken, chatId, telegramUserId);

            // 4. Vincular User ID (em paralelo com conversão)
            const linkUserPromise = this.attributionService.linkUser(
                visitorId,
                funnelId,
                botId,
                telegramUserId,
                telegramUsername,
                telegramFullName,
                {
                    linked_via: "join_request",
                    chat_id: chatId
                }
            );

            // 5. Processar Conversão CAPI (em paralelo)
            const conversionPromise = this.conversionService.processLeadConversion(
                visitorId,
                funnelId,
                telegramUserId,
                telegramUsername,
                telegramFullName,
                chatId,
                undefined,
                inviteName,
                "join_request_approval"
            );

            // 6. Notificação Pushcut (fire-and-forget)
            this.pushcutService.notifyJoinRequest(
                funnelId,
                telegramUserId,
                telegramUsername,
                telegramFullName,
                chatTitle
            ).catch(err => console.error('[JoinHandler] Pushcut error:', err));

            await Promise.all([linkUserPromise, conversionPromise]);

            console.log(`[JoinHandler] ✅ Background processing completed for user ${telegramUserId}`);
        } catch (error) {
            console.error(`[JoinHandler] Background processing error for user ${telegramUserId}:`, error);
            await this.approveUser(botToken, chatId, telegramUserId).catch(e => console.error(e));
        }
    }

    private async approveUser(botToken: string, chatId: number, userId: number) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/approveChatJoinRequest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, user_id: userId })
            });
            const result = await response.json();
            if (result.ok) {
                console.log(`[JoinHandler] ✅ Auto-aprovado user ${userId} no chat ${chatId}`);
            } else {
                console.error(`[JoinHandler] ❌ Erro ao aprovar:`, result.description);
            }
        } catch (e) {
            console.error(`[JoinHandler] ❌ Erro ao aprovar:`, e);
        }
    }
}
