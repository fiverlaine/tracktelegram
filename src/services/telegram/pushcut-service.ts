/**
 * Pushcut Notification Service
 * 
 * Serviço para enviar notificações Pushcut baseadas nos eventos do TrackGram.
 * Este serviço é chamado pelos handlers de webhook e serviços de conversão.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { 
    sendPushcutNotification, 
    parseTemplate,
    type PushcutEventType,
    type PushcutEventData
} from "@/lib/pushcut";

export class PushcutService {
    constructor(private supabase: SupabaseClient) {}

    /**
     * Notifica sobre novo lead/join
     */
    async notifyNewLead(
        funnelId: string,
        telegramUsername: string | undefined,
        telegramName: string | undefined,
        chatTitle: string | undefined
    ): Promise<void> {
        const userId = await this.getFunnelOwnerId(funnelId);
        if (!userId) return;

        const { data: funnelData } = await this.supabase
            .from("funnels")
            .select("name")
            .eq("id", funnelId)
            .single();

        await this.sendNotification(userId, "new_lead", {
            username: telegramUsername || "Novo usuário",
            name: telegramName || telegramUsername || "Novo usuário",
            channel: chatTitle || "Canal",
            funnel: funnelData?.name || "Funil"
        });
    }

    /**
     * Notifica sobre entrada de membro
     */
    async notifyMemberJoin(
        funnelId: string,
        telegramUserId: number,
        telegramUsername: string | undefined,
        telegramName: string | undefined,
        chatTitle: string | undefined
    ): Promise<void> {
        const userId = await this.getFunnelOwnerId(funnelId);
        if (!userId) return;

        const { data: funnelData } = await this.supabase
            .from("funnels")
            .select("name")
            .eq("id", funnelId)
            .single();

        await this.sendNotification(userId, "member_join", {
            username: telegramUsername || "Usuário",
            name: telegramName || telegramUsername || "Usuário",
            user_id: String(telegramUserId),
            channel: chatTitle || "Canal",
            funnel: funnelData?.name || "Funil"
        });
    }

    /**
     * Notifica sobre saída de membro
     */
    async notifyMemberLeave(
        funnelId: string,
        telegramUserId: number,
        chatTitle: string | undefined
    ): Promise<void> {
        const userId = await this.getFunnelOwnerId(funnelId);
        if (!userId) return;

        const { data: funnelData } = await this.supabase
            .from("funnels")
            .select("name")
            .eq("id", funnelId)
            .single();

        // Buscar nome do usuário se disponível
        const { data: linkData } = await this.supabase
            .from("visitor_telegram_links")
            .select("telegram_username, telegram_name")
            .eq("telegram_user_id", telegramUserId)
            .maybeSingle();

        const displayName = linkData?.telegram_name || linkData?.telegram_username || `Usuário ${telegramUserId}`;
        
        await this.sendNotification(userId, "member_leave", {
            username: linkData?.telegram_username || String(telegramUserId),
            name: linkData?.telegram_name || linkData?.telegram_username || String(telegramUserId),
            user_id: String(telegramUserId),
            channel: chatTitle || "Canal",
            funnel: funnelData?.name || "Funil"
        });
    }

    /**
     * Notifica sobre solicitação de entrada (join request)
     */
    async notifyJoinRequest(
        funnelId: string,
        telegramUserId: number,
        telegramUsername: string | undefined,
        telegramName: string | undefined,
        chatTitle: string | undefined
    ): Promise<void> {
        const userId = await this.getFunnelOwnerId(funnelId);
        if (!userId) return;

        const { data: funnelData } = await this.supabase
            .from("funnels")
            .select("name")
            .eq("id", funnelId)
            .single();

        await this.sendNotification(userId, "join_request", {
            username: telegramUsername || "Usuário",
            name: telegramName || telegramUsername || "Usuário",
            user_id: String(telegramUserId),
            channel: chatTitle || "Canal",
            funnel: funnelData?.name || "Funil"
        });
    }

    /**
     * Notifica sobre pageview
     */
    async notifyPageview(
        funnelId: string,
        visitorId: string,
        pageUrl: string | undefined,
        source: string | undefined
    ): Promise<void> {
        const userId = await this.getFunnelOwnerId(funnelId);
        if (!userId) return;

        const { data: funnelData } = await this.supabase
            .from("funnels")
            .select("name")
            .eq("id", funnelId)
            .single();

        await this.sendNotification(userId, "pageview", {
            visitor_id: visitorId.substring(0, 8),
            page_url: pageUrl || "Página",
            funnel: funnelData?.name || "Funil",
            source: source || "direto"
        });
    }

    /**
     * Notifica sobre click
     */
    async notifyClick(
        funnelId: string,
        visitorId: string,
        pageUrl: string | undefined,
        source: string | undefined
    ): Promise<void> {
        const userId = await this.getFunnelOwnerId(funnelId);
        if (!userId) return;

        const { data: funnelData } = await this.supabase
            .from("funnels")
            .select("name")
            .eq("id", funnelId)
            .single();

        await this.sendNotification(userId, "click", {
            visitor_id: visitorId.substring(0, 8),
            page_url: pageUrl || "Página",
            funnel: funnelData?.name || "Funil",
            source: source || "direto"
        });
    }

    // ========================================
    // PRIVATE METHODS
    // ========================================

    /**
     * Busca o user_id dono do funil
     */
    private async getFunnelOwnerId(funnelId: string): Promise<string | null> {
        const { data: funnel } = await this.supabase
            .from("funnels")
            .select("user_id")
            .eq("id", funnelId)
            .single();

        return funnel?.user_id || null;
    }

    /**
     * Envia notificação Pushcut para um usuário
     */
    private async sendNotification(
        userId: string,
        eventType: PushcutEventType,
        eventData: PushcutEventData
    ): Promise<void> {
        try {
            // 1. Buscar integração do usuário
            const { data: integration } = await this.supabase
                .from("pushcut_integrations")
                .select("*")
                .eq("user_id", userId)
                .eq("is_active", true)
                .single();

            if (!integration) {
                return; // Usuário não tem Pushcut configurado
            }

            // 2. Buscar config do evento
            const { data: notification } = await this.supabase
                .from("pushcut_notifications")
                .select("*")
                .eq("integration_id", integration.id)
                .eq("event_type", eventType)
                .eq("enabled", true)
                .single();

            if (!notification) {
                return; // Este evento não está habilitado
            }

            // 3. Parse templates
            const title = parseTemplate(notification.title_template, eventData);
            const text = parseTemplate(notification.text_template, eventData);

            // 4. Enviar notificação
            const result = await sendPushcutNotification({
                apiKey: integration.api_key,
                notificationName: integration.notification_name,
                title,
                text,
                sound: notification.sound || undefined
            });

            // 5. Log
            await this.supabase.from("pushcut_logs").insert({
                integration_id: integration.id,
                event_type: eventType,
                title,
                text,
                status: result.success ? "sent" : "failed",
                error_message: result.error || null,
                metadata: eventData
            });

            if (result.success) {
                console.log(`[PushcutService] Notification sent for ${eventType} to user ${userId}`);
            } else {
                console.error(`[PushcutService] Failed to send notification for ${eventType}:`, result.error);
            }

        } catch (error) {
            console.error("[PushcutService] Error in sendNotification:", error);
        }
    }
}
