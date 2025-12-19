"use server";

import { createClient } from "@/lib/supabase/server";
import { 
    testPushcutConnection, 
    listPushcutNotifications,
    sendPushcutNotification,
    parseTemplate,
    DEFAULT_TEMPLATES,
    type PushcutEventType,
    type PushcutEventData
} from "@/lib/pushcut";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export interface PushcutIntegration {
    id: string;
    user_id: string;
    api_key: string;
    notification_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PushcutNotification {
    id: string;
    integration_id: string;
    event_type: PushcutEventType;
    enabled: boolean;
    title_template: string;
    text_template: string;
    sound: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================
// GET INTEGRATION
// ============================================

export async function getPushcutIntegration(): Promise<{ 
    integration: PushcutIntegration | null; 
    notifications: PushcutNotification[];
    error?: string 
}> {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { integration: null, notifications: [], error: "Não autenticado" };
    }
    
    // Buscar integração
    const { data: integration, error: integrationError } = await supabase
        .from("pushcut_integrations")
        .select("*")
        .eq("user_id", user.id)
        .single();
    
    if (integrationError && integrationError.code !== "PGRST116") {
        console.error("[Pushcut] Error fetching integration:", integrationError);
        return { integration: null, notifications: [], error: integrationError.message };
    }
    
    // Se não há integração, retornar vazio
    if (!integration) {
        return { integration: null, notifications: [] };
    }
    
    // Buscar notificações configuradas
    const { data: notifications, error: notificationsError } = await supabase
        .from("pushcut_notifications")
        .select("*")
        .eq("integration_id", integration.id)
        .order("event_type");
    
    if (notificationsError) {
        console.error("[Pushcut] Error fetching notifications:", notificationsError);
        return { integration, notifications: [], error: notificationsError.message };
    }
    
    return { integration, notifications: notifications || [] };
}

// ============================================
// SAVE INTEGRATION
// ============================================

export async function savePushcutIntegration(data: {
    api_key: string;
    notification_name: string;
    is_active?: boolean;
}): Promise<{ success: boolean; integration?: PushcutIntegration; error?: string }> {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Não autenticado" };
    }
    
    // Testar conexão antes de salvar
    const testResult = await testPushcutConnection(data.api_key);
    if (!testResult.success) {
        return { success: false, error: testResult.error || "Falha ao conectar com Pushcut" };
    }
    
    // Verificar se já existe
    const { data: existing } = await supabase
        .from("pushcut_integrations")
        .select("id")
        .eq("user_id", user.id)
        .single();
    
    let integration: PushcutIntegration;
    
    if (existing) {
        // Atualizar
        const { data: updated, error } = await supabase
            .from("pushcut_integrations")
            .update({
                api_key: data.api_key,
                notification_name: data.notification_name,
                is_active: data.is_active ?? true
            })
            .eq("id", existing.id)
            .select()
            .single();
        
        if (error) {
            console.error("[Pushcut] Error updating integration:", error);
            return { success: false, error: error.message };
        }
        
        integration = updated;
    } else {
        // Criar nova
        const { data: created, error } = await supabase
            .from("pushcut_integrations")
            .insert({
                user_id: user.id,
                api_key: data.api_key,
                notification_name: data.notification_name,
                is_active: data.is_active ?? true
            })
            .select()
            .single();
        
        if (error) {
            console.error("[Pushcut] Error creating integration:", error);
            return { success: false, error: error.message };
        }
        
        integration = created;
        
        // Criar configurações padrão para todos os eventos
        const defaultNotifications = Object.entries(DEFAULT_TEMPLATES).map(([eventType, templates]) => ({
            integration_id: integration.id,
            event_type: eventType,
            enabled: eventType === 'new_lead' || eventType === 'member_join', // Ativar apenas os principais
            title_template: templates.title,
            text_template: templates.text
        }));
        
        const { error: notifError } = await supabase
            .from("pushcut_notifications")
            .insert(defaultNotifications);
        
        if (notifError) {
            console.error("[Pushcut] Error creating default notifications:", notifError);
        }
    }
    
    revalidatePath("/integrations/pushcut");
    return { success: true, integration };
}

// ============================================
// UPDATE NOTIFICATION CONFIG
// ============================================

export async function updatePushcutNotification(data: {
    id: string;
    enabled?: boolean;
    title_template?: string;
    text_template?: string;
    sound?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Não autenticado" };
    }
    
    const updateData: Record<string, any> = {};
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.title_template !== undefined) updateData.title_template = data.title_template;
    if (data.text_template !== undefined) updateData.text_template = data.text_template;
    if (data.sound !== undefined) updateData.sound = data.sound;
    
    const { error } = await supabase
        .from("pushcut_notifications")
        .update(updateData)
        .eq("id", data.id);
    
    if (error) {
        console.error("[Pushcut] Error updating notification:", error);
        return { success: false, error: error.message };
    }
    
    revalidatePath("/integrations/pushcut");
    return { success: true };
}

// ============================================
// DELETE INTEGRATION
// ============================================

export async function deletePushcutIntegration(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Não autenticado" };
    }
    
    const { error } = await supabase
        .from("pushcut_integrations")
        .delete()
        .eq("user_id", user.id);
    
    if (error) {
        console.error("[Pushcut] Error deleting integration:", error);
        return { success: false, error: error.message };
    }
    
    revalidatePath("/integrations/pushcut");
    return { success: true };
}

// ============================================
// TEST NOTIFICATION
// ============================================

export async function testPushcutNotificationAction(eventType: PushcutEventType): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Não autenticado" };
    }
    
    // Buscar integração
    const { data: integration } = await supabase
        .from("pushcut_integrations")
        .select("*")
        .eq("user_id", user.id)
        .single();
    
    if (!integration) {
        return { success: false, error: "Integração não configurada" };
    }
    
    // Buscar config do evento
    const { data: notification } = await supabase
        .from("pushcut_notifications")
        .select("*")
        .eq("integration_id", integration.id)
        .eq("event_type", eventType)
        .single();
    
    if (!notification) {
        return { success: false, error: "Notificação não configurada" };
    }
    
    // Dados de teste
    const testData: PushcutEventData = {
        username: "Usuário Teste",
        user_id: "123456789",
        channel: "Meu Canal",
        funnel: "Funil de Teste",
        visitor_id: "test-visitor-id",
        page_url: "https://example.com",
        source: "facebook"
    };
    
    const title = parseTemplate(notification.title_template, testData);
    const text = parseTemplate(notification.text_template, testData);
    
    const result = await sendPushcutNotification({
        apiKey: integration.api_key,
        notificationName: integration.notification_name,
        title: `[TESTE] ${title}`,
        text,
        sound: notification.sound || undefined
    });
    
    return result;
}

// ============================================
// SEND NOTIFICATION (Internal Use)
// ============================================

/**
 * Envia notificação Pushcut para um evento específico
 * Esta função é chamada internamente pelos webhooks e não pelo cliente
 */
export async function sendPushcutEventNotification(
    userId: string,
    eventType: PushcutEventType,
    eventData: PushcutEventData
): Promise<void> {
    // Usar Service Role para bypass RLS (chamada interna)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("[Pushcut] Missing Supabase credentials");
        return;
    }
    
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);
    
    try {
        // Buscar integração do usuário
        const { data: integration } = await supabase
            .from("pushcut_integrations")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .single();
        
        if (!integration) {
            return; // Usuário não tem Pushcut configurado
        }
        
        // Buscar config do evento
        const { data: notification } = await supabase
            .from("pushcut_notifications")
            .select("*")
            .eq("integration_id", integration.id)
            .eq("event_type", eventType)
            .eq("enabled", true)
            .single();
        
        if (!notification) {
            return; // Este evento não está habilitado
        }
        
        // Parse templates
        const title = parseTemplate(notification.title_template, eventData);
        const text = parseTemplate(notification.text_template, eventData);
        
        // Enviar notificação
        const result = await sendPushcutNotification({
            apiKey: integration.api_key,
            notificationName: integration.notification_name,
            title,
            text,
            sound: notification.sound || undefined
        });
        
        // Log
        await supabase.from("pushcut_logs").insert({
            integration_id: integration.id,
            event_type: eventType,
            title,
            text,
            status: result.success ? "sent" : "failed",
            error_message: result.error || null,
            metadata: eventData
        });
        
        if (result.success) {
            console.log(`[Pushcut] Notification sent for ${eventType} to user ${userId}`);
        } else {
            console.error(`[Pushcut] Failed to send notification for ${eventType}:`, result.error);
        }
        
    } catch (error) {
        console.error("[Pushcut] Error in sendPushcutEventNotification:", error);
    }
}
