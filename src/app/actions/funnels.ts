"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/config/subscription-plans";
import { revalidatePath } from "next/cache";

interface CreateFunnelData {
    name: string;
    slug: string;
    pixel_id: string;
    bot_id: string;
}

export async function createFunnel(data: CreateFunnelData) {
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

    // 4. Check Limits
    if (planLimits.funnels !== 'unlimited') {
        const { count, error: countError } = await supabase
            .from("funnels")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", user.id);

        if (countError) {
            throw new Error("Erro ao verificar limites");
        }

        if ((count || 0) >= planLimits.funnels) {
            throw new Error(`Limite de funis atingido (${count}/${planLimits.funnels}). Faça upgrade do plano.`);
        }
    }

    // 5. Insert Funnel
    const { error: insertError } = await supabase.from("funnels").insert({
        user_id: user.id,
        name: data.name,
        slug: data.slug,
        pixel_id: data.pixel_id,
        bot_id: data.bot_id
    });

    if (insertError) {
        if (insertError.code === '23505') {
            throw new Error("Este slug já existe. Escolha outro.");
        }
        throw new Error(`Erro ao salvar funil: ${insertError.message}`);
    }

    revalidatePath("/funnels");
    return { success: true };
}
