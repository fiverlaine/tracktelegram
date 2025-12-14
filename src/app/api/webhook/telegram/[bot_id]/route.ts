
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCAPIEvent } from "@/lib/facebook-capi";

/**
 * Cria cliente Supabase com validação de variáveis de ambiente
 */
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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




        // 0. Handle Generic Text Messages (Inbound)
        if (update.message?.text && !update.message.text.startsWith("/")) {
            const telegramUserId = update.message.from.id;
            const telegramUsername = update.message.from.username;
            const messageText = update.message.text;
            const isPrivate = update.message.chat.type === "private";



            // Só salvar mensagens privadas (DM com o bot)
            if (isPrivate) {
                // 1. Tentar descobrir o Funnel ID pelo vínculo existente (User -> Visitor -> Funnel)
                const { data: linkData } = await supabase
                    .from("visitor_telegram_links")
                    .select("funnel_id")
                    .eq("telegram_user_id", telegramUserId)
                    .order("linked_at", { ascending: false })
                    .limit(1)
                    .single();

                const funnelId = linkData?.funnel_id;

                // 2. Salvar log APENAS se o usuário estiver vinculado a um funil (Trackeado)
                if (funnelId) {
                    console.log(`[Webhook] Mensagem recebida de ${telegramUserId} (Trackeado): ${messageText}`);
                    await supabase.from("telegram_message_logs").insert({
                        funnel_id: funnelId,
                        telegram_chat_id: telegramUserId.toString(),
                        telegram_user_name: telegramUsername || update.message.from.first_name,
                        direction: 'inbound',
                        message_content: messageText,
                        status: 'received'
                    });
                } else {
                    console.log(`[Webhook] Mensagem ignorada de ${telegramUserId} (Não trackeado)`);
                }
            }
        }

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

                    // Primeiro: Buscar por visitor_id que começa com o prefixo (sem filtrar telegram_user_id)
                    const { data: linkData, error: linkError } = await supabase
                        .from("visitor_telegram_links")
                        .select("id, visitor_id, funnel_id, metadata")
                        .like("visitor_id", `${partialVisitorId}%`)
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
                    // Buscar dados do funil e pixels associados (Multi-Pixel)
                    const { data: funnelData, error: funnelError } = await supabase
                        .from("funnels")
                        .select(`
                            id, 
                            name, 
                            pixel_id,
                            use_join_request,
                            pixels:pixels!funnels_pixel_id_fkey (id, pixel_id, access_token),
                            funnel_pixels (
                                pixels (id, pixel_id, access_token)
                            )
                        `)
                        .eq("id", funnelId)
                        .single();

                    console.log(`[Webhook] Funil encontrado:`, funnelData ? funnelData.id : 'null', funnelError);

                    // Collect Pixels
                    let pixelsToFire: any[] = [];
                    if (funnelData) {
                        // Legacy/Primary
                        const legacyPixel = funnelData.pixels as any;
                        if (legacyPixel?.pixel_id) {
                            pixelsToFire.push(legacyPixel);
                        }

                        // Multi-pixels
                        if (funnelData.funnel_pixels && Array.isArray(funnelData.funnel_pixels)) {
                            funnelData.funnel_pixels.forEach((fp: any) => {
                                if (fp.pixels) {
                                    pixelsToFire.push(fp.pixels);
                                }
                            });
                        }
                    }

                    // Deduplicate
                    const uniquePixels = Array.from(new Map(pixelsToFire.map(p => [p.pixel_id, p])).values());
                    console.log(`[Webhook] Total pixels para disparar: ${uniquePixels.length}`);

                    // Buscar metadata do visitante... (mantem igual)
                    const { data: eventData, error: eventError } = await supabase
                        .from("events")
                        .select("metadata")
                        .eq("visitor_id", visitorId)
                        .in("event_type", ["click", "pageview"])
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                    console.log(`[Webhook] Metadata do visitor:`, eventData?.metadata ? 'encontrado' : 'não encontrado', eventError);

                    // Registrar evento "join"
                    await supabase.from("events").insert({
                        funnel_id: funnelId,
                        visitor_id: visitorId,
                        event_type: "join",
                        metadata: {
                            source: "telegram_webhook",
                            telegram_user_id: telegramUserId,
                            telegram_username: telegramUsername,
                            chat_id: chatId,
                            chat_title: chatTitle,
                            invite_name: inviteName
                        }
                    });

                    console.log(`[Webhook] Evento JOIN registrado para visitor_id: ${visitorId}`);

                    // Enviar para Facebook CAPI
                    let metadata: any = eventData?.metadata || null;

                    if (!metadata) {
                        console.log(`[Webhook] eventData nulo, buscando metadata diretamente...`);
                        const { data: clickData } = await supabase
                            .from("events")
                            .select("metadata")
                            .eq("visitor_id", visitorId)
                            .eq("event_type", "click")
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .single();

                        metadata = clickData?.metadata || null;
                    }

                    if (uniquePixels.length > 0) {
                        console.log(`[Webhook] Preparando envio CAPI para ${uniquePixels.length} pixels...`);

                        const capiPromises = uniquePixels.map(async (pixelData) => {
                            if (!pixelData?.access_token || !pixelData?.pixel_id) return;

                            try {
                                return await sendCAPIEvent(
                                    pixelData.access_token,
                                    pixelData.pixel_id,
                                    "Lead",
                                    {
                                        fbc: metadata?.fbc || undefined,
                                        fbp: metadata?.fbp || undefined,
                                        user_agent: metadata?.user_agent || undefined,
                                        ip_address: metadata?.ip_address || undefined,
                                        external_id: visitorId,
                                        ct: metadata?.city || undefined,
                                        st: metadata?.region || undefined,
                                        country: metadata?.country || undefined
                                    },
                                    {
                                        content_name: funnelData?.name || "Lead"
                                    },
                                    {
                                        visitor_id: visitorId,
                                        funnel_id: funnelId!
                                    }
                                );
                            } catch (err) {
                                console.error(`[Webhook] Erro envio CAPI Pixel ${pixelData.pixel_id}:`, err);
                            }
                        });

                        await Promise.all(capiPromises);
                        console.log(`[Webhook] ✅ Processamento CAPI concluído.`);
                    } else {
                        console.log(`[Webhook] ⚠️ Nenhum pixel configurado para este funil.`);
                    }


                    // --- NOVA LÓGICA: Enviar Mensagem de Boas-vindas ---
                    // Se use_join_request for true, a mensagem já foi enviada no evento chat_join_request
                    if (!funnelData?.use_join_request) {
                        try {
                            // Buscar token do bot para enviar msg ou revogar link
                            const { data: botData } = await supabase
                                .from("telegram_bots")
                                .select("bot_token")
                                .eq("id", bot_id)
                                .single();

                            if (botData?.bot_token) {
                                // 1. Tentar revogar o link de convite (Limpeza)
                                if (inviteLink?.invite_link) {
                                    await fetch(`https://api.telegram.org/bot${botData.bot_token}/revokeChatInviteLink`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            chat_id: chatId,
                                            invite_link: inviteLink.invite_link
                                        })
                                    });
                                    console.log(`[Webhook] Link de convite revogado após entrada direta.`);
                                }

                                // 2. Enviar boas-vindas
                                console.log(`[Webhook] Verificando configurações de boas-vindas para funil ${funnelId}...`);

                                const { data: welcomeSettings } = await supabase
                                    .from("funnel_welcome_settings")
                                    .select("*")
                                    .eq("funnel_id", funnelId)
                                    .eq("is_active", true)
                                    .single();

                                if (welcomeSettings) {
                                    console.log(`[Webhook] Configuração de boas-vindas encontrada. Enviando...`);
                                    
                                    // Preparar mensagem
                                    let messageText = welcomeSettings.message_text || "";
                                    const firstName = chatMember.new_chat_member?.user?.first_name || "Visitante";
                                    const username = chatMember.new_chat_member?.user?.username ? `@${chatMember.new_chat_member.user.username}` : "";

                                    messageText = messageText.replace(/{first_name}/g, firstName).replace(/{username}/g, username);

                                    // Preparar botões
                                    const inlineKeyboard = welcomeSettings.buttons_config?.map((btn: any) => ([
                                        { text: btn.label, url: btn.url }
                                    ])) || [];

                                    // Enviar Mensagem
                                    const response = await fetch(`https://api.telegram.org/bot${botData.bot_token}/sendMessage`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            chat_id: telegramUserId, // Envia no privado
                                            text: messageText,
                                            reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined
                                        })
                                    });

                                    const result = await response.json();
                                    
                                    // Logar envio
                                    await supabase.from("telegram_message_logs").insert({
                                        funnel_id: funnelId,
                                        telegram_chat_id: telegramUserId.toString(),
                                        telegram_user_name: username || firstName,
                                        direction: 'outbound',
                                        message_content: messageText,
                                        status: result.ok ? 'sent' : 'failed'
                                    });
                                }
                            }
                        } catch (err) {
                            console.error("[Webhook] Erro ao processar boas-vindas/revogação:", err);
                        }
                    }
                    // ---------------------------------------------------
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
                const partialVisitorId = inviteName.substring(2);

                // Buscar bot_token e dados do funil
                const { data: botData } = await supabase
                    .from("telegram_bots")
                    .select("bot_token, chat_id")
                    .eq("id", bot_id)
                    .single();

                // Tentar descobrir o Funnel ID pelo visitor_id parcial
                const { data: linkData } = await supabase
                    .from("visitor_telegram_links")
                    .select("funnel_id, visitor_id")
                    .like("visitor_id", `${partialVisitorId}%`)
                    .limit(1)
                    .single();

                const funnelId = linkData?.funnel_id;

                if (botData?.bot_token && botData?.chat_id) {
                    // 1. Aprovar Entrada
                    await fetch(`https://api.telegram.org/bot${botData.bot_token}/approveChatJoinRequest`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: botData.chat_id,
                            user_id: telegramUserId
                        })
                    });
                    console.log(`[Webhook] Auto-aprovado user ${telegramUserId}`);

                    // 2. Revogar o Link de Convite (Limpeza)
                    if (inviteLink?.invite_link) {
                        try {
                            await fetch(`https://api.telegram.org/bot${botData.bot_token}/revokeChatInviteLink`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: botData.chat_id,
                                    invite_link: inviteLink.invite_link
                                })
                            });
                            console.log(`[Webhook] Link de convite revogado após aprovação.`);
                        } catch (e) {
                            console.error(`[Webhook] Erro ao revogar link:`, e);
                        }
                    }

                    // 3. Enviar Mensagem de Boas-vindas (se tiver funil)
                    if (funnelId) {
                        try {
                            const { data: welcomeSettings } = await supabase
                                .from("funnel_welcome_settings")
                                .select("*")
                                .eq("funnel_id", funnelId)
                                .eq("is_active", true)
                                .single();

                            if (welcomeSettings) {
                                let messageText = welcomeSettings.message_text || "";
                                const firstName = request.from?.first_name || "Visitante";
                                const username = request.from?.username ? `@${request.from.username}` : "";

                                messageText = messageText.replace(/{first_name}/g, firstName).replace(/{username}/g, username);

                                const inlineKeyboard = welcomeSettings.buttons_config?.map((btn: any) => ([
                                    { text: btn.label, url: btn.url }
                                ])) || [];

                                const response = await fetch(`https://api.telegram.org/bot${botData.bot_token}/sendMessage`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        chat_id: telegramUserId,
                                        text: messageText,
                                        reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined
                                    })
                                });

                                const result = await response.json();

                                // Logar envio
                                await supabase.from("telegram_message_logs").insert({
                                    funnel_id: funnelId,
                                    telegram_chat_id: telegramUserId.toString(),
                                    telegram_user_name: username || firstName,
                                    direction: 'outbound',
                                    message_content: messageText,
                                    status: result.ok ? 'sent' : 'failed'
                                });
                                console.log(`[Webhook] Mensagem de boas-vindas enviada após aprovação.`);
                            }
                        } catch (err) {
                            console.error("[Webhook] Erro ao enviar boas-vindas na aprovação:", err);
                        }
                    }
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
