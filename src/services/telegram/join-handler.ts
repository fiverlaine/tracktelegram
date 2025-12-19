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

            // 3. Processar Conversão (CAPI)
            if (visitorId && funnelId) {
                // Enviar notificação Pushcut para novo lead
                this.pushcutService.notifyNewLead(
                    funnelId,
                    telegramUsername,
                    telegramFullName,
                    chatTitle
                ).catch(err => console.error('[JoinHandler] Pushcut notification error:', err));

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
        const chatTitle = request.chat?.title; // Pode não vir no request
        const telegramUsername = request.from?.username;
        const telegramFirstName = request.from?.first_name || "";
        const telegramLastName = request.from?.last_name || "";
        const telegramFullName = `${telegramFirstName} ${telegramLastName}`.trim();

        console.log(`[JoinHandler] Join Request recebido de ${telegramUserId}, invite: ${inviteName}`);

        if (inviteName && (inviteName.startsWith("v_") || inviteName.startsWith("pool_"))) {
            // 1. Atribuição
            const attribution = await this.attributionService.findVisitor(inviteName, telegramUserId, botId);
            
            const visitorId = attribution.visitorId;
            const funnelId = attribution.funnelId;
            let linkData = attribution.linkData;

            // 2. Buscar dados do bot para aprovação
            const { data: botData } = await this.supabase
                .from("telegram_bots")
                .select("bot_token, chat_id")
                .eq("id", botId)
                .single();

            if (botData?.bot_token && botData?.chat_id) {
                // 3. Vincular User ID
                let linkId = null;
                if (visitorId && funnelId) {
                    linkId = await this.attributionService.linkUser(
                        visitorId,
                        funnelId,
                        botId,
                        telegramUserId,
                        telegramUsername,
                        telegramFullName,
                        {
                            linked_via: "join_request",
                            chat_id: botData.chat_id
                        }
                    );

                    // 4. Processar Conversão (CAPI) - ANTES de aprovar
                    await this.conversionService.processLeadConversion(
                        visitorId,
                        funnelId,
                        telegramUserId,
                        telegramUsername,
                        telegramFullName,
                        botData.chat_id,
                        undefined,
                        inviteName,
                        "join_request_approval"
                    );

                    // Enviar notificação Pushcut para join request / new lead
                    this.pushcutService.notifyJoinRequest(
                        funnelId,
                        telegramUserId,
                        telegramUsername,
                        telegramFullName,
                        chatTitle
                    ).catch(err => console.error('[JoinHandler] Pushcut join_request notification error:', err));
                }

                // 5. Enviar Boas-vindas (Pré-Aprovação)
                // Verificar se já enviou
                let welcomeSentAt = linkData?.welcome_sent_at;
                if (linkId && !welcomeSentAt) {
                     const { data } = await this.supabase
                        .from("visitor_telegram_links")
                        .select("welcome_sent_at")
                        .eq("id", linkId)
                        .maybeSingle();
                    welcomeSentAt = data?.welcome_sent_at;
                }

                if (funnelId && !welcomeSentAt) {
                    // Nota: Passamos chatId como o ID do usuário para enviar no privado, 
                    // mas para revogar link precisamos do ID do chat do grupo.
                    // O WelcomeService usa telegramUserId para enviar msg e chatId para revogar.
                    // Aqui request.user_chat_id é onde o user iniciou o bot, ou usamos telegramUserId.
                    await this.welcomeService.sendWelcome(
                        funnelId,
                        botId,
                        telegramUserId, // Enviar para o user
                        botData.chat_id, // Chat ID do grupo para revogar link
                        telegramFirstName,
                        telegramUsername,
                        inviteLink?.invite_link, // Link para revogar
                        linkId || undefined,
                        visitorId || undefined
                    );
                }

                // 6. Aprovar Entrada
                try {
                    await fetch(`https://api.telegram.org/bot${botData.bot_token}/approveChatJoinRequest`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: botData.chat_id,
                            user_id: telegramUserId
                        })
                    });
                    console.log(`[JoinHandler] Auto-aprovado user ${telegramUserId}`);
                } catch (e) {
                    console.error(`[JoinHandler] Erro ao aprovar:`, e);
                }
            }
        }
    }
}
