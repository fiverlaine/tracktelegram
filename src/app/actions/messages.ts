"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface WelcomeSettings {
    funnel_id: string;
    is_active: boolean;
    message_text: string;
    buttons_config: { label: string; url: string }[];
    image_url?: string;
    use_join_request?: boolean; // Novo campo vindo de funnels
}

export async function getWelcomeSettings(funnelId: string) {
    const supabase = await createClient();

    // Buscar configurações de boas-vindas
    const { data: settingsData, error: settingsError } = await supabase
        .from("funnel_welcome_settings")
        .select("*")
        .eq("funnel_id", funnelId)
        .single();

    // Buscar configuração do funil (use_join_request)
    const { data: funnelData } = await supabase
        .from("funnels")
        .select("use_join_request")
        .eq("id", funnelId)
        .single();

    if (settingsError && settingsError.code !== "PGRST116") {
        console.error("Error fetching welcome settings:", settingsError);
        return null;
    }

    // Combinar os dados
    return {
        ...(settingsData || {
            funnel_id: funnelId,
            is_active: false,
            message_text: "Olá {first_name}! Seja bem-vindo ao nosso canal exclusivo.",
            buttons_config: [],
            image_url: ""
        }),
        use_join_request: funnelData?.use_join_request || false
    };
}

export async function saveWelcomeSettings(settings: WelcomeSettings) {
    const supabase = await createClient();
    console.log("Saving settings for funnel:", settings.funnel_id, settings);

    // 1. Salvar configurações de boas-vindas
    const { error: settingsError } = await supabase
        .from("funnel_welcome_settings")
        .upsert({
            funnel_id: settings.funnel_id,
            is_active: settings.is_active,
            message_text: settings.message_text,
            buttons_config: settings.buttons_config,
            image_url: settings.image_url,
            updated_at: new Date().toISOString()
        }, { onConflict: 'funnel_id' });

    if (settingsError) {
        console.error("Error saving welcome settings:", settingsError);
        throw new Error("Failed to save settings: " + settingsError.message);
    }

    // 2. Salvar configuração do funil (use_join_request)
    if (settings.use_join_request !== undefined) {
        const { error: funnelError } = await supabase
            .from("funnels")
            .update({ use_join_request: settings.use_join_request })
            .eq("id", settings.funnel_id);

        if (funnelError) {
            console.error("Error updating funnel join request setting:", funnelError);
            // Não vamos lançar erro aqui para não invalidar o salvamento anterior, mas logamos
        }
    }

    revalidatePath("/messages");
    return { success: true };
}

export async function getMessageLogs(funnelId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("telegram_message_logs")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching logs:", error);
        return [];
    }


    return data;
}

// --- CHAT ACTIONS ---

export interface ChatPreview {
    telegram_chat_id: string;
    telegram_user_name: string;
    last_message: string;
    last_message_at: string;
    unread_count: number; // Por enquanto mockado ou baseado em status
}

export async function getChatList(funnelId: string): Promise<ChatPreview[]> {
    const supabase = await createClient();

    // Buscar últimos 200 logs para montar a lista de conversas recentes
    // Idealmente, teríamos uma tabela 'conversations', mas vamos agregar em tempo real para MVP
    const { data, error } = await supabase
        .from("telegram_message_logs")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("created_at", { ascending: false })
        .limit(200);

    if (error) {
        console.error("Error fetching chat list logs:", error);
        return [];
    }

    // Agrupar por telegram_chat_id
    const chatsMap = new Map<string, ChatPreview>();

    data.forEach((log) => {
        if (!chatsMap.has(log.telegram_chat_id)) {
            chatsMap.set(log.telegram_chat_id, {
                telegram_chat_id: log.telegram_chat_id,
                telegram_user_name: log.telegram_user_name || "Usuário",
                last_message: log.message_content,
                last_message_at: log.created_at,
                unread_count: 0
            });
        }
    });

    return Array.from(chatsMap.values());
}

export async function getConversationMessages(funnelId: string, telegramChatId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("telegram_message_logs")
        .select("*")
        .eq("funnel_id", funnelId)
        .eq("telegram_chat_id", telegramChatId)
        .order("created_at", { ascending: true }) // Mais antigas primeiro para renderizar de cima p/ baixo
        .limit(100);

    if (error) {
        console.error("Error fetching conversation:", error);
        return [];
    }

    return data;
}


export async function sendReplyMessage(funnelId: string, telegramChatId: string, messageText: string) {
    try {
        const supabase = await createClient();

        // 1. Buscar Token do Bot
        const { data: funnelData, error: funnelError } = await supabase
            .from("funnels")
            .select(`
                telegram_bots (
                    bot_token
                )
            `)
            .eq("id", funnelId)
            .single();

        if (funnelError || !funnelData) {
            console.error("Error fetching funnel bot token:", funnelError);
            throw new Error(`Funnel not found or error fetching bot: ${funnelError?.message}`);
        }

        const botData: any = funnelData.telegram_bots;
        // Handle array or single object response (Supabase relation can be tricky depending on schema)
        const botToken = Array.isArray(botData) ? botData[0]?.bot_token : botData?.bot_token;

        if (!botToken) {
            throw new Error("Bot token NOT found for this funnel. Check if a bot is connected.");
        }

        // 2. Enviar via Telegram API
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: messageText
            })
        });

        const result = await response.json();

        if (!result.ok) {
            console.error("Telegram API Error Response:", result);
            throw new Error(`Telegram API Error: ${result.description}`);
        }

        // 3. Salvar Log Outbound
        const { error: insertError } = await supabase.from("telegram_message_logs").insert({
            funnel_id: funnelId,
            telegram_chat_id: telegramChatId,
            telegram_user_name: result.result?.chat?.first_name || result.result?.chat?.username || "Bot",
            direction: 'outbound',
            message_content: messageText,
            status: 'sent'
        });

        if (insertError) {
            console.error("Error saving outbound log:", insertError);
            // We don't throw here because message was sent successfully
        }

        return { success: true };
    } catch (error: any) {
        console.error("sendReplyMessage Exception:", error);
        throw new Error(error.message || "Failed to send message");
    }
}

