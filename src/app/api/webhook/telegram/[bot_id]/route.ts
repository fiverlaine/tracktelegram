
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCAPIEvent } from "@/lib/facebook-capi";

/**
 * Cria cliente Supabase com validação de variáveis de ambiente
 */
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL não está configurada");
    }
    if (!supabaseKey) {
        throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY não está configurada");
    }

    return createClient(supabaseUrl, supabaseKey);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ bot_id: string }> }
) {
    try {
        const supabase = getSupabaseClient();
        const { bot_id } = await params;
        const update = await request.json();

        console.log(`[Webhook] Received for bot ${bot_id}:`, JSON.stringify(update, null, 2));

        // 1. Handle /start command (Deep Linking) - Fluxo Legacy
        if (update.message?.text?.startsWith("/start ")) {
            const args = update.message.text.split(" ");
            if (args.length > 1) {
                const visitorId = args[1].trim();
                const telegramUserId = update.message.from.id;
                const telegramUsername = update.message.from.username;

                console.log(`[Webhook] /start - Linking Visitor ${visitorId} to Telegram ID ${telegramUserId}`);

                const { data: botData } = await supabase
                    .from("funnels")
                    .select(`
                        id,
                        telegram_bots (
                            bot_token,
                            channel_link
                        )
                    `)
                    .eq("bot_id", bot_id)
                    .single();

                await supabase.from("visitor_telegram_links").upsert({
                    visitor_id: visitorId,
                    telegram_user_id: telegramUserId,
                    telegram_username: telegramUsername,
                    bot_id: bot_id,
                    funnel_id: botData?.id,
                    linked_at: new Date().toISOString()
                }, { onConflict: 'visitor_id' });

                const botRelation: any = botData?.telegram_bots;
                const botToken = Array.isArray(botRelation) ? botRelation[0]?.bot_token : botRelation?.bot_token;
                const channelLink = Array.isArray(botRelation) ? botRelation[0]?.channel_link : botRelation?.channel_link;

                if (botToken && channelLink) {
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: telegramUserId,
                            text: "🚀 Tudo pronto! Clique abaixo para entrar no grupo VIP:",
                            reply_markup: {
                                inline_keyboard: [[
                                    { text: "👉 ENTRAR NO GRUPO AGORA", url: channelLink }
                                ]]
                            }
                        })
                    });
                }
            }
        }

        // 2. Handle Chat Member Updates (Join/Leave) - FLUXO PRINCIPAL
        const chatMember = update.chat_member || update.my_chat_member;

        if (chatMember) {
            const newStatus = chatMember.new_chat_member?.status;
            const oldStatus = chatMember.old_chat_member?.status;
            const telegramUserId = chatMember.new_chat_member?.user?.id || chatMember.from?.id;
            const telegramUsername = chatMember.new_chat_member?.user?.username || chatMember.from?.username;
            const chatId = chatMember.chat?.id;
            const chatTitle = chatMember.chat?.title;

            // Extrair invite_link se disponível (FLUXO DIRETO com links dinâmicos)
            const inviteLink = chatMember.invite_link;
            const inviteName = inviteLink?.name; // Formato: "v_{visitor_id}"

            console.log(`[Webhook] Chat Member Update:`, {
                newStatus,
                oldStatus,
                telegramUserId,
                inviteName,
                chatId,
                chatTitle
            });

            // Check if it's a "Join" event
            const isJoin = ['member', 'creator', 'administrator'].includes(newStatus) &&
                !['member', 'creator', 'administrator'].includes(oldStatus);

            // Check if it's a "Leave" event
            const isLeave = ['left', 'kicked'].includes(newStatus) &&
                ['member', 'creator', 'administrator'].includes(oldStatus);

            if (isJoin) {
                console.log(`[Webhook] User ${telegramUserId} JOINED! invite_name: ${inviteName}`);

                let visitorId: string | null = null;
                let funnelId: string | null = null;

                // MÉTODO 1: Extrair visitor_id do invite_link.name (Fluxo Direto)
                if (inviteName && inviteName.startsWith("v_")) {
                    // O invite_name é "v_{visitor_id}" onde visitor_id foi truncado em 28 chars
                    const partialVisitorId = inviteName.substring(2); // Remove "v_"
                    
                    console.log(`[Webhook] Buscando por visitor_id que começa com: ${partialVisitorId}`);

                    // Buscar o registro que corresponde ao visitor_id parcial
                    const { data: linkData, error: linkError } = await supabase
                        .from("visitor_telegram_links")
                        .select("id, visitor_id, funnel_id, metadata")
                        .like("visitor_id", `${partialVisitorId}%`)
                        .eq("telegram_user_id", 0) // Ainda não foi vinculado
                        .order("linked_at", { ascending: false })
                        .limit(1)
                        .single();

                    if (linkData) {
                        visitorId = linkData.visitor_id;
                        funnelId = linkData.funnel_id;
                        
                        console.log(`[Webhook] Encontrado visitor_id: ${visitorId}, funnel_id: ${funnelId}`);

                        // Atualizar o registro com o telegram_user_id real
                        await supabase
                            .from("visitor_telegram_links")
                            .update({
                                telegram_user_id: telegramUserId,
                                telegram_username: telegramUsername,
                                linked_at: new Date().toISOString(),
                                metadata: {
                                    ...linkData.metadata,
                                    linked_via: "dynamic_invite",
                                    chat_id: chatId,
                                    chat_title: chatTitle
                                }
                            })
                            .eq("id", linkData.id);
                    } else {
                        console.log(`[Webhook] Nenhum registro encontrado para invite_name: ${inviteName}`, linkError);
                    }
                }

                // MÉTODO 2: Fallback - buscar por telegram_user_id (se já foi vinculado via /start)
                if (!visitorId) {
                    const { data: linkData } = await supabase
                        .from("visitor_telegram_links")
                        .select("visitor_id, funnel_id")
                        .eq("telegram_user_id", telegramUserId)
                        .order("linked_at", { ascending: false })
                        .limit(1)
                        .single();

                    if (linkData) {
                        visitorId = linkData.visitor_id;
                        funnelId = linkData.funnel_id;
                        console.log(`[Webhook] Fallback: encontrado via telegram_user_id`);
                    }
                }

                // MÉTODO 3: Fallback - buscar click mais recente sem vínculo (menos preciso)
                if (!visitorId) {
                    // Buscar o click mais recente dos últimos 5 minutos que não tem join
                    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                    
                    const { data: recentClick } = await supabase
                        .from("events")
                        .select("visitor_id, funnel_id")
                        .eq("event_type", "click")
                        .gte("created_at", fiveMinutesAgo)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                    if (recentClick) {
                        // Verificar se esse visitor_id já tem um join
                        const { data: existingJoin } = await supabase
                            .from("events")
                            .select("id")
                            .eq("visitor_id", recentClick.visitor_id)
                            .eq("event_type", "join")
                            .limit(1)
                            .single();

                        if (!existingJoin) {
                            visitorId = recentClick.visitor_id;
                            funnelId = recentClick.funnel_id;
                            console.log(`[Webhook] Fallback timing: usando click recente`);
                        }
                    }
                }

                // Processar se encontrou o visitor_id
                if (visitorId && funnelId) {
                    // Buscar dados do funil e pixel
                    const { data: funnelData } = await supabase
                        .from("funnels")
                        .select(`
                            id, 
                            name,
                            pixels (
                                pixel_id, 
                                access_token
                            )
                        `)
                        .eq("id", funnelId)
                        .single();

                    // Buscar metadata do visitante (fbc, fbp, user_agent, UTMs, etc)
                    // Prioridade: click > pageview (click tem dados mais completos)
                    const { data: clickData } = await supabase
                        .from("events")
                        .select("metadata")
                        .eq("visitor_id", visitorId)
                        .eq("event_type", "click")
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                    const { data: pageviewData } = await supabase
                        .from("events")
                        .select("metadata")
                        .eq("visitor_id", visitorId)
                        .eq("event_type", "pageview")
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                    // Usar click se disponível, senão pageview
                    const eventData = clickData || pageviewData;
                    const sourceMetadata: any = eventData?.metadata || {};

                    // Registrar evento "join" com TODOS os metadados (UTMs, fbclid, etc)
                    await supabase.from("events").insert({
                        funnel_id: funnelId,
                        visitor_id: visitorId,
                        event_type: "join",
                        metadata: {
                            // Dados do Telegram
                            source: "telegram_webhook",
                            telegram_user_id: telegramUserId,
                            telegram_username: telegramUsername,
                            chat_id: chatId,
                            chat_title: chatTitle,
                            invite_name: inviteName,
                            // Dados do click/pageview (UTMs, Facebook, etc)
                            ...sourceMetadata,
                            // Sobrescrever com dados mais recentes do Telegram
                            join_timestamp: new Date().toISOString()
                        }
                    });

                    console.log(`[Webhook] Evento JOIN registrado para visitor_id: ${visitorId}`);

                    // Enviar para Facebook CAPI com TODOS os dados disponíveis
                    if (funnelData?.pixels && sourceMetadata) {
                        const pixel: any = Array.isArray(funnelData.pixels) ? funnelData.pixels[0] : funnelData.pixels;
                        const metadata: any = sourceMetadata;

                        if (pixel?.access_token && pixel?.pixel_id) {
                            try {
                                // Preparar custom_data com UTMs e outras informações
                                const customData: any = {
                                    content_name: funnelData.name,
                                    content_category: "telegram_group"
                                };

                                // Adicionar UTMs se disponíveis
                                if (metadata.utm_source) customData.utm_source = metadata.utm_source;
                                if (metadata.utm_medium) customData.utm_medium = metadata.utm_medium;
                                if (metadata.utm_campaign) customData.utm_campaign = metadata.utm_campaign;
                                if (metadata.utm_content) customData.utm_content = metadata.utm_content;
                                if (metadata.utm_term) customData.utm_term = metadata.utm_term;

                                await sendCAPIEvent(
                                    pixel.access_token,
                                    pixel.pixel_id,
                                    "Lead",
                                    {
                                        fbc: metadata.fbc,
                                        fbp: metadata.fbp,
                                        user_agent: metadata.user_agent,
                                        ip_address: metadata.ip_address || "0.0.0.0",
                                        external_id: visitorId
                                    },
                                    customData
                                );
                                console.log(`[Webhook] CAPI Lead enviado com sucesso!`, {
                                    visitor_id: visitorId,
                                    has_utms: !!(metadata.utm_source || metadata.utm_medium),
                                    has_fbc: !!metadata.fbc,
                                    has_fbp: !!metadata.fbp
                                });
                            } catch (capiError) {
                                console.error(`[Webhook] Erro ao enviar CAPI:`, capiError);
                            }
                        } else {
                            console.log(`[Webhook] Pixel não configurado ou sem access_token`);
                        }
                    } else {
                        console.log(`[Webhook] Sem dados de pixel ou metadata para enviar CAPI`);
                    }
                } else {
                    console.log(`[Webhook] Não foi possível encontrar visitor_id para telegram_user_id: ${telegramUserId}`);
                    
                    // Registrar join sem vínculo (para métricas gerais)
                    await supabase.from("events").insert({
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
            }

            // Handle Leave event
            if (isLeave) {
                console.log(`[Webhook] User ${telegramUserId} LEFT!`);

                // Buscar visitor_id vinculado a esse telegram_user_id
                const { data: linkData } = await supabase
                    .from("visitor_telegram_links")
                    .select("visitor_id, funnel_id")
                    .eq("telegram_user_id", telegramUserId)
                    .order("linked_at", { ascending: false })
                    .limit(1)
                    .single();

                if (linkData) {
                    await supabase.from("events").insert({
                        funnel_id: linkData.funnel_id,
                        visitor_id: linkData.visitor_id,
                        event_type: "leave",
                        metadata: {
                            source: "telegram_webhook",
                            telegram_user_id: telegramUserId,
                            chat_id: chatId,
                            chat_title: chatTitle
                        }
                    });
                    console.log(`[Webhook] Evento LEAVE registrado`);
                }
            }
        }

        // 3. Handle Chat Join Request (para canais com aprovação)
        if (update.chat_join_request) {
            const request = update.chat_join_request;
            const telegramUserId = request.from?.id;
            const inviteLink = request.invite_link;
            const inviteName = inviteLink?.name;

            console.log(`[Webhook] Chat Join Request:`, {
                telegramUserId,
                inviteName
            });

            // Auto-aprovar se tiver invite_link válido
            if (inviteName && inviteName.startsWith("v_")) {
                // Buscar bot_token para aprovar
                const { data: botData } = await supabase
                    .from("telegram_bots")
                    .select("bot_token, chat_id")
                    .eq("id", bot_id)
                    .single();

                if (botData?.bot_token && botData?.chat_id) {
                    await fetch(`https://api.telegram.org/bot${botData.bot_token}/approveChatJoinRequest`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: botData.chat_id,
                            user_id: telegramUserId
                        })
                    });
                    console.log(`[Webhook] Auto-aprovado user ${telegramUserId}`);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Webhook] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: "active", service: "TrackGram Webhook v3.1" });
}
