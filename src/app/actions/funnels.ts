"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/config/subscription-plans";
import { revalidatePath } from "next/cache";

// ... (imports remain same)

interface CreateFunnelData {
    name: string;
    slug: string;
    pixel_ids: string[]; // Changed from pixel_id string to array
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

    if (subError && subError.code !== "PGRST116") {
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
    // Use the first pixel as the "primary" one for backward compatibility
    const primaryPixelId = data.pixel_ids.length > 0 ? data.pixel_ids[0] : null;

    const { data: newFunnel, error: insertError } = await supabase.from("funnels").insert({
        user_id: user.id,
        name: data.name,
        slug: data.slug,
        pixel_id: primaryPixelId,
        bot_id: data.bot_id
    }).select().single();

    if (insertError) {
        if (insertError.code === '23505') {
            throw new Error("Este slug já existe. Escolha outro.");
        }
        throw new Error(`Erro ao salvar funil: ${insertError.message}`);
    }

    // 6. Insert Funnel Pixels (Many-to-Many)
    if (data.pixel_ids.length > 0 && newFunnel) {
        const pixelInserts = data.pixel_ids.map(pid => ({
            funnel_id: newFunnel.id,
            pixel_id: pid
        }));
        
        const { error: pixelError } = await supabase.from("funnel_pixels").insert(pixelInserts);
        if (pixelError) {
            console.error("Erro ao vincular pixels extras:", pixelError);
            // Non-fatal, but worth logging
        }
    }

    revalidatePath("/funnels");
    return { success: true };
}

export async function updateFunnel(id: string, data: CreateFunnelData) {
    const supabase = await createClient();
    
    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // 2. Update Basic Info
    // Set primary pixel for compatibility
    const primaryPixelId = data.pixel_ids.length > 0 ? data.pixel_ids[0] : null;

    const { error: updateError } = await supabase
        .from("funnels")
        .update({
            name: data.name,
            slug: data.slug,
            pixel_id: primaryPixelId,
            bot_id: data.bot_id
        })
        .eq("id", id)
        .eq("user_id", user.id);

    if (updateError) {
        if (updateError.code === '23505') throw new Error("Slug já em uso.");
        throw new Error("Erro ao atualizar funil");
    }

    // 3. Sync Pixels (Delete All + Re-insert)
    // First, remove existing relations
    await supabase.from("funnel_pixels").delete().eq("funnel_id", id);

    // Then insert new ones
    if (data.pixel_ids.length > 0) {
        const pixelInserts = data.pixel_ids.map(pid => ({
            funnel_id: id,
            pixel_id: pid
        }));
        await supabase.from("funnel_pixels").insert(pixelInserts);
    }

    revalidatePath("/funnels");
    return { success: true };
}
