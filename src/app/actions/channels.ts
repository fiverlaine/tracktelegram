"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/config/subscription-plans";
import { revalidatePath } from "next/cache";

interface CreateChannelData {
    name: string;
    bot_token: string;
    channel_link: string;
    username: string;
}

export async function createChannel(data: CreateChannelData) {
    const supabase = await createClient();
    
    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error("Usuário não autenticado");
    }

    // 2. Get Subscription
    const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("status, plan_name")
        .eq("user_id", user.id)
        .single();

    if (subError && subError.code !== "PGRST116") { // Ignore 'not found' initially
        throw new Error("Erro ao verificar assinatura");
    }

    if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
        throw new Error("Assinatura inativa ou não encontrada.");
    }

    // 3. Get Plan Limits
    const planLimits = getPlanLimits(subscription.plan_name);
    if (!planLimits) {
        throw new Error(`Plano desconhecido: ${subscription.plan_name}. Entre em contato com o suporte.`);
    }

    // 4. Check Limits (Count current bots)
    if (planLimits.channels !== 9999) { // 9999 = unlimited logic
        const { count, error: countError } = await supabase
            .from("telegram_bots")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", user.id);

        if (countError) {
            throw new Error("Erro ao verificar limites");
        }

        if ((count || 0) >= planLimits.channels) {
            throw new Error(`Limite de canais atingido (${count}/${planLimits.channels}). Faça upgrade do plano.`);
        }
    }

    // 5. Insert Channel
    const { error: insertError } = await supabase.from("telegram_bots").insert({
        user_id: user.id,
        name: data.name,
        bot_token: data.bot_token,
        channel_link: data.channel_link,
        username: data.username
    });

    if (insertError) {
        throw new Error(`Erro ao salvar canal: ${insertError.message}`);
    }

    revalidatePath("/channels");
    return { success: true };
}

export async function updateChannel(id: string, data: CreateChannelData) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error("Usuário não autenticado");
    }

    const { error } = await supabase
        .from("telegram_bots")
        .update({
            name: data.name,
            bot_token: data.bot_token,
            channel_link: data.channel_link,
            username: data.username
        })
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) {
        throw new Error(`Erro ao atualizar canal: ${error.message}`);
    }

    revalidatePath("/channels");
    return { success: true };
}
