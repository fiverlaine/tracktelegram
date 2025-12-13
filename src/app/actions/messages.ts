"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface WelcomeSettings {
    funnel_id: string;
    is_active: boolean;
    message_text: string;
    buttons_config: { label: string; url: string }[];
    image_url?: string;
}

export async function getWelcomeSettings(funnelId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("funnel_welcome_settings")
        .select("*")
        .eq("funnel_id", funnelId)
        .single();

    if (error && error.code !== "PGRST116") { // Ignore not found
        console.error("Error fetching welcome settings:", error);
        return null;
    }

    return data;
}

export async function saveWelcomeSettings(settings: WelcomeSettings) {
    const supabase = await createClient();
    console.log("Saving settings for funnel:", settings.funnel_id, settings);

    const { error } = await supabase
        .from("funnel_welcome_settings")
        .upsert({
            funnel_id: settings.funnel_id,
            is_active: settings.is_active,
            message_text: settings.message_text,
            buttons_config: settings.buttons_config,
            image_url: settings.image_url,
            updated_at: new Date().toISOString()
        }, { onConflict: 'funnel_id' });

    if (error) {
        console.error("Error saving welcome settings:", error);
        throw new Error("Failed to save settings: " + error.message);
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
