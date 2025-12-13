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
    const { data: funnelData, error: funnelError } = await supabase
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
