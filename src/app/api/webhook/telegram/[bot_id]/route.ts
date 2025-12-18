
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
                const chatType = chatMember.chat?.type || 'unknown';
                console.log(`[Webhook] User ${telegramUserId} JOINED! invite_name: ${inviteName || 'N/A'}, chat_type: ${chatType}, chat_id: ${chatId}`);

                let visitorId: string | null = null;
                let funnelId: string | null = null;

                // MÉTODO 1: Extrair visitor_id do invite_link.name (Fluxo Direto)
                if (inviteName) {
                    // CASO A: Link Gerado On-Demand (v_{visitor_id})
                    if (inviteName.startsWith("v_")) {
                        const partialVisitorId = inviteName.substring(2); // Remove "v_"
                        console.log(`[Webhook] Buscando por visitor_id que começa com: ${partialVisitorId}`);

                        const { data: linkData, error: linkError } = await supabase
                            .from("visitor_telegram_links")
                            .select("id, visitor_id, funnel_id, metadata, welcome_sent_at")
                            .like("visitor_id", `${partialVisitorId}%`)
                            .order("linked_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (linkData) {
                            visitorId = linkData.visitor_id;
                            funnelId = linkData.funnel_id;
                            const welcomeSentAt = linkData.welcome_sent_at;
                            console.log(`[Webhook] Encontrado visitor_id (On-Demand): ${visitorId}, welcome_sent_at: ${welcomeSentAt}`);

                            // Atualizar registro
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
                        }
                    }
                    // CASO B: Link do Pool (pool_{uuid})
                    else if (inviteName.startsWith("pool_")) {
                        console.log(`[Webhook] Detectado link do Pool: ${inviteName}`);

                        // Buscar quem recebeu este invite_name específico
                        // O invite_name está salvo dentro do JSONB metadata -> invite_name
                        const { data: linkData, error: linkError } = await supabase
                            .from("visitor_telegram_links")
                            .select("id, visitor_id, funnel_id, metadata, welcome_sent_at")
                            .eq("metadata->>invite_name", inviteName)
                            .order("linked_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (linkData) {
                            visitorId = linkData.visitor_id;
                            funnelId = linkData.funnel_id;
                            const welcomeSentAt = linkData.welcome_sent_at;
                            console.log(`[Webhook] Encontrado visitor_id (Pool): ${visitorId}, welcome_sent_at: ${welcomeSentAt}`);

                            // Atualizar registro
                            await supabase
                                .from("visitor_telegram_links")
                                .update({
                                    telegram_user_id: telegramUserId,
                                    telegram_username: telegramUsername,
                                    linked_at: new Date().toISOString(),
                                    metadata: {
                                        ...linkData.metadata,
                                        linked_via: "pool_invite",
                                        chat_id: chatId,
                                        chat_title: chatTitle
                                    }
                                })
                                .eq("id", linkData.id);
                        } else {
                            console.log(`[Webhook] Link do pool não encontrado na tabela de links: ${inviteName}`);
                        }
                    }
                }

                // MÉTODO 2: Fallback - buscar por telegram_user_id (se já foi vinculado via /start ou chat_join_request)
                // IMPORTANTE: Para grupos, o invite_link pode não estar presente no chat_member,
                // então precisamos confiar neste fallback
                if (!visitorId && telegramUserId) {
                    console.log(`[Webhook] Tentando fallback por telegram_user_id: ${telegramUserId}`);
                    const { data: linkData } = await supabase
                        .from("visitor_telegram_links")
                        .select("visitor_id, funnel_id, bot_id, welcome_sent_at")
                        .eq("telegram_user_id", telegramUserId)
                        .order("linked_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (linkData) {
                        // Verificar se o bot_id corresponde (importante para evitar conflitos)
                        if (!bot_id || linkData.bot_id === bot_id) {
                            visitorId = linkData.visitor_id;
                            funnelId = linkData.funnel_id;
                            console.log(`[Webhook] ✅ Fallback: encontrado via telegram_user_id - visitor_id: ${visitorId}, funnel_id: ${funnelId}, welcome_sent_at: ${linkData.welcome_sent_at || 'null'}`);
                        } else {
                            console.log(`[Webhook] ⚠️ Registro encontrado mas bot_id não corresponde (${linkData.bot_id} != ${bot_id})`);
                        }
                    } else {
                        console.log(`[Webhook] ❌ Nenhum registro encontrado para telegram_user_id: ${telegramUserId}`);
                    }
                }

                // MÉTODO 3: Fallback - buscar click mais recente sem vínculo (menos preciso)
                // IMPORTANTE: Para grupos sem invite_link, este pode ser o único método que funciona
                if (!visitorId) {
                    // Aumentar janela de tempo para 10 minutos (grupos podem ter delay maior)
                    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
                    console.log(`[Webhook] Tentando fallback por click recente (últimos 10 minutos)...`);

                    // Buscar clicks recentes do mesmo bot_id (via funis)
                    const { data: recentClicks } = await supabase
                        .from("events")
                        .select("visitor_id, funnel_id, created_at")
                        .eq("event_type", "click")
                        .gte("created_at", tenMinutesAgo)
                        .order("created_at", { ascending: false })
                        .limit(10); // Buscar mais registros para filtrar depois

                    if (recentClicks && recentClicks.length > 0) {
                        // Buscar funis do bot_id atual
                        const { data: botFunnels } = await supabase
                            .from("funnels")
                            .select("id")
                            .eq("bot_id", bot_id);

                        const botFunnelIds = botFunnels?.map(f => f.id) || [];

                        // Filtrar clicks que pertencem a funis deste bot
                        const relevantClicks = recentClicks.filter(click =>
                            click.funnel_id && botFunnelIds.includes(click.funnel_id)
                        );

                        if (relevantClicks.length > 0) {
                            // Pegar o click mais recente que não tem join ainda
                            for (const click of relevantClicks) {
                                const { data: existingJoin } = await supabase
                                    .from("events")
                                    .select("id")
                                    .eq("visitor_id", click.visitor_id)
                                    .eq("event_type", "join")
                                    .limit(1)
                                    .maybeSingle();

                                if (!existingJoin) {
                                    visitorId = click.visitor_id;
                                    funnelId = click.funnel_id;
                                    console.log(`[Webhook] ✅ Fallback timing: usando click recente - visitor_id: ${visitorId}, funnel_id: ${funnelId}`);
                                    break;
                                }
                            }
                        }
                    }

                    if (!visitorId) {
                        console.log(`[Webhook] ❌ Nenhum click recente encontrado para vincular ao telegram_user_id: ${telegramUserId}`);
                    }
                }

                // Se encontrou visitor_id mas ainda não está vinculado ao telegram_user_id, vincular agora
                if (visitorId && funnelId && telegramUserId) {
                    const { data: existingLink } = await supabase
                        .from("visitor_telegram_links")
                        .select("id, telegram_user_id")
                        .eq("visitor_id", visitorId)
                        .eq("funnel_id", funnelId)
                        .maybeSingle();

                    // Se o registro existe mas não tem telegram_user_id vinculado, atualizar
                    if (existingLink && (!existingLink.telegram_user_id || existingLink.telegram_user_id === 0)) {
                        await supabase
                            .from("visitor_telegram_links")
                            .update({
                                telegram_user_id: telegramUserId,
                                telegram_username: telegramUsername,
                                linked_at: new Date().toISOString()
                            })
                            .eq("id", existingLink.id);
                        console.log(`[Webhook] ✅ Vinculado telegram_user_id ${telegramUserId} ao visitor_id ${visitorId} durante chat_member`);
                    }
                    // Se não existe registro, criar um novo
                    else if (!existingLink) {
                        await supabase
                            .from("visitor_telegram_links")
                            .upsert({
                                visitor_id: visitorId,
                                funnel_id: funnelId,
                                bot_id: bot_id,
                                telegram_user_id: telegramUserId,
                                telegram_username: telegramUsername,
                                linked_at: new Date().toISOString(),
                                metadata: {
                                    linked_via: "chat_member_fallback",
                                    chat_id: chatId,
                                    chat_title: chatTitle
                                }
                            }, { onConflict: "visitor_id,telegram_user_id" });
                        console.log(`[Webhook] ✅ Criado novo registro vinculando telegram_user_id ${telegramUserId} ao visitor_id ${visitorId}`);
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
                            pixels:pixels (id, pixel_id, access_token),
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
                            ...(eventData?.metadata || {}), // Merge UTMs and other metadata
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
                                        country: metadata?.country || undefined,
                                        zp: metadata?.postal_code || undefined
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
                    // Verificar se já foi enviada recentemente para este visitor_id
                    // Usar busca em cascata para garantir que encontre o registro correto
                    // mesmo se o chat_join_request já tiver atualizado o registro
                    let linkDataForWelcome = null;

                    // MÉTODO 1: Tentar usar o invite_name (mais preciso)
                    if (inviteName) {
                        if (inviteName.startsWith("v_")) {
                            const partialVisitorId = inviteName.substring(2);
                            const { data } = await supabase
                                .from("visitor_telegram_links")
                                .select("id, welcome_sent_at, telegram_user_id")
                                .like("visitor_id", `${partialVisitorId}%`)
                                .eq("funnel_id", funnelId)
                                .order("linked_at", { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            linkDataForWelcome = data;
                            console.log(`[Webhook] Busca por invite_name (v_): ${linkDataForWelcome ? 'encontrado' : 'não encontrado'}`);
                        } else if (inviteName.startsWith("pool_")) {
                            const { data } = await supabase
                                .from("visitor_telegram_links")
                                .select("id, welcome_sent_at, telegram_user_id")
                                .eq("metadata->>invite_name", inviteName)
                                .eq("funnel_id", funnelId)
                                .order("linked_at", { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            linkDataForWelcome = data;
                            console.log(`[Webhook] Busca por invite_name (pool_): ${linkDataForWelcome ? 'encontrado' : 'não encontrado'}`);
                        }
                    }

                    // MÉTODO 2: Fallback - buscar por telegram_user_id (caso o chat_member chegue após chat_join_request)
                    if (!linkDataForWelcome && telegramUserId) {
                        const { data } = await supabase
                            .from("visitor_telegram_links")
                            .select("id, welcome_sent_at, telegram_user_id")
                            .eq("telegram_user_id", telegramUserId)
                            .eq("funnel_id", funnelId)
                            .order("linked_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        linkDataForWelcome = data;
                        console.log(`[Webhook] Busca por telegram_user_id: ${linkDataForWelcome ? 'encontrado' : 'não encontrado'}`);
                    }

                    // MÉTODO 3: Último fallback - buscar por visitor_id e funnel_id
                    if (!linkDataForWelcome && visitorId) {
                        const { data } = await supabase
                            .from("visitor_telegram_links")
                            .select("id, welcome_sent_at, telegram_user_id")
                            .eq("visitor_id", visitorId)
                            .eq("funnel_id", funnelId)
                            .order("linked_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        linkDataForWelcome = data;
                        console.log(`[Webhook] Busca por visitor_id + funnel_id: ${linkDataForWelcome ? 'encontrado' : 'não encontrado'}`);
                    }

                    if (!linkDataForWelcome?.welcome_sent_at) {
                        console.log(`[Webhook] Mensagem de boas-vindas NÃO foi enviada ainda. Enviando agora...`);
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

                                    if (result.ok) {
                                        // Marcar como enviado usando o ID do registro encontrado (mais preciso)
                                        if (linkDataForWelcome?.id) {
                                            await supabase
                                                .from("visitor_telegram_links")
                                                .update({ welcome_sent_at: new Date().toISOString() })
                                                .eq("id", linkDataForWelcome.id);
                                        } else {
                                            // Fallback: usar visitor_id e funnel_id se não tiver ID
                                            await supabase
                                                .from("visitor_telegram_links")
                                                .update({ welcome_sent_at: new Date().toISOString() })
                                                .eq("visitor_id", visitorId)
                                                .eq("funnel_id", funnelId);
                                        }
                                        console.log(`[Webhook] ✅ Mensagem de boas-vindas enviada e marcada como enviada.`);
                                    } else {
                                        console.error(`[Webhook] ❌ Erro ao enviar mensagem de boas-vindas:`, result.description);
                                    }

                                    // Logar envio
                                    await supabase.from("telegram_message_logs").insert({
                                        funnel_id: funnelId,
                                        telegram_chat_id: telegramUserId.toString(),
                                        telegram_user_name: username || firstName,
                                        direction: 'outbound',
                                        message_content: messageText,
                                        status: result.ok ? 'sent' : 'failed',
                                        error_message: result.ok ? null : result.description
                                    });
                                }
                            }
                        } catch (err) {
                            console.error("[Webhook] Erro ao processar boas-vindas/revogação:", err);
                        }
                    } else {
                        console.log(`[Webhook] Mensagem de boas-vindas já enviada anteriormente em ${linkDataForWelcome.welcome_sent_at}`);
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

                    // --- CAPI SAÍDA (CUSTOM EVENT) ---
                    // 1. Buscar Pixels do Funil
                    const { data: funnelData } = await supabase
                        .from("funnels")
                        .select(`
                            id, 
                            name, 
                            pixel_id,
                            pixels:pixels (id, pixel_id, access_token),
                            funnel_pixels (
                                pixels (id, pixel_id, access_token)
                            )
                        `)
                        .eq("id", linkData.funnel_id)
                        .single();

                    // Collect Pixels
                    let pixelsToFire: any[] = [];
                    if (funnelData) {
                        const legacyPixel = funnelData.pixels as any;
                        if (legacyPixel?.pixel_id) pixelsToFire.push(legacyPixel);

                        if (funnelData.funnel_pixels && Array.isArray(funnelData.funnel_pixels)) {
                            funnelData.funnel_pixels.forEach((fp: any) => {
                                if (fp.pixels) pixelsToFire.push(fp.pixels);
                            });
                        }
                    }
                    const uniquePixels = Array.from(new Map(pixelsToFire.map(p => [p.pixel_id, p])).values());

                    // 2. Buscar Metadata (fbc, fbp, ip, geo) do Vistor
                    // Buscar os últimos 5 eventos para garantir que pegamos metadados completos
                    const { data: eventsList } = await supabase
                        .from("events")
                        .select("metadata")
                        .eq("visitor_id", linkData.visitor_id)
                        .in("event_type", ["click", "pageview"])
                        .order("created_at", { ascending: false })
                        .limit(5);

                    let metadata: any = {};

                    if (eventsList && eventsList.length > 0) {
                        for (const ev of eventsList) {
                            const m = ev.metadata || {};
                            if (!metadata.fbc && m.fbc) metadata.fbc = m.fbc;
                            if (!metadata.fbp && m.fbp) metadata.fbp = m.fbp;
                            if (!metadata.user_agent && m.user_agent) metadata.user_agent = m.user_agent;
                            if (!metadata.ip_address && m.ip_address) metadata.ip_address = m.ip_address;
                            if (!metadata.city && m.city) metadata.city = m.city;
                            if (!metadata.region && m.region) metadata.region = m.region;
                            if (!metadata.country && m.country) metadata.country = m.country;
                            if (!metadata.postal_code && m.postal_code) metadata.postal_code = m.postal_code;
                        }
                    }

                    // 3. Disparar CAPI "SaidaDeCanal"
                    if (uniquePixels.length > 0) {
                        console.log(`[Webhook] Disparando CAPI SaidaDeCanal para ${uniquePixels.length} pixels...`);

                        const capiPromises = uniquePixels.map(async (pixelData) => {
                            if (!pixelData?.access_token || !pixelData?.pixel_id) return;

                            try {
                                return await sendCAPIEvent(
                                    pixelData.access_token,
                                    pixelData.pixel_id,
                                    "SaidaDeCanal", // Custom Event Name
                                    {
                                        fbc: metadata.fbc || undefined,
                                        fbp: metadata.fbp || undefined,
                                        user_agent: metadata.user_agent || undefined,
                                        ip_address: metadata.ip_address || undefined,
                                        external_id: linkData.visitor_id,
                                        ct: metadata.city || undefined,
                                        st: metadata.region || undefined,
                                        country: metadata.country || undefined,
                                        zp: metadata.postal_code || undefined
                                    },
                                    {
                                        content_name: funnelData?.name || "Saída de Canal"
                                    },
                                    {
                                        visitor_id: linkData.visitor_id,
                                        funnel_id: linkData.funnel_id!
                                    }
                                );
                            } catch (err) {
                                console.error(`[Webhook] Erro envio CAPI Saída (Pixel ${pixelData.pixel_id}):`, err);
                            }
                        });

                        await Promise.all(capiPromises);
                    }
                }
            }
        }

        // 3. Handle Chat Join Request (para grupos e canais com aprovação)
        if (update.chat_join_request) {
            const request = update.chat_join_request;
            const telegramUserId = request.from?.id;
            const inviteLink = request.invite_link;
            const inviteName = inviteLink?.name;

            const chatType = request.chat?.type || 'unknown';
            const chatId = request.chat?.id;
            console.log(`[Webhook] Chat Join Request recebido:`, {
                telegramUserId,
                inviteName: inviteName || 'N/A',
                chatType,
                chatId
            });

            // Auto-aprovar se tiver invite_link válido
            if (inviteName && (inviteName.startsWith("v_") || inviteName.startsWith("pool_"))) {
                let visitorId: string | null = null;
                let funnelId: string | null = null;
                let linkData: any = null;

                // Buscar bot_token e dados do funil
                const { data: botData } = await supabase
                    .from("telegram_bots")
                    .select("bot_token, chat_id")
                    .eq("id", bot_id)
                    .single();

                if (inviteName.startsWith("v_")) {
                    const partialVisitorId = inviteName.substring(2);
                    const { data } = await supabase
                        .from("visitor_telegram_links")
                        .select("id, funnel_id, visitor_id, metadata, welcome_sent_at, bot_id")
                        .like("visitor_id", `${partialVisitorId}%`)
                        .eq("bot_id", bot_id) // Filtrar por bot_id para evitar conflitos
                        .order("linked_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    linkData = data;
                    console.log(`[Webhook] Join Request - Busca por invite_name (v_): ${linkData ? 'encontrado' : 'não encontrado'}`);
                } else if (inviteName.startsWith("pool_")) {
                    const { data } = await supabase
                        .from("visitor_telegram_links")
                        .select("id, funnel_id, visitor_id, metadata, welcome_sent_at, bot_id")
                        .eq("metadata->>invite_name", inviteName)
                        .eq("bot_id", bot_id) // Filtrar por bot_id para evitar conflitos
                        .order("linked_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    linkData = data;
                    console.log(`[Webhook] Join Request - Busca por invite_name (pool_): ${linkData ? 'encontrado' : 'não encontrado'}`);
                }

                if (linkData) {
                    funnelId = linkData.funnel_id;
                    visitorId = linkData.visitor_id;
                    console.log(`[Webhook] Join Request - linkData encontrado: visitor_id=${visitorId}, funnel_id=${funnelId}`);
                } else {
                    // Fallback: tentar buscar por telegram_user_id (caso o usuário já tenha sido vinculado antes)
                    console.log(`[Webhook] Join Request - linkData não encontrado por invite_name. Tentando fallback por telegram_user_id...`);
                    if (telegramUserId) {
                        const { data: fallbackLinkData } = await supabase
                            .from("visitor_telegram_links")
                            .select("id, funnel_id, visitor_id, welcome_sent_at, bot_id")
                            .eq("telegram_user_id", telegramUserId)
                            .eq("bot_id", bot_id)
                            .order("linked_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (fallbackLinkData) {
                            linkData = fallbackLinkData;
                            funnelId = fallbackLinkData.funnel_id;
                            visitorId = fallbackLinkData.visitor_id;
                            console.log(`[Webhook] Join Request - ✅ Fallback encontrado: visitor_id=${visitorId}, funnel_id=${funnelId}`);
                        } else {
                            console.log(`[Webhook] Join Request - ❌ Fallback também não encontrou registro para telegram_user_id=${telegramUserId}`);

                            // Último fallback: buscar click recente dos últimos 10 minutos
                            console.log(`[Webhook] Join Request - Tentando último fallback: buscar click recente...`);
                            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

                            const { data: recentClicks } = await supabase
                                .from("events")
                                .select("visitor_id, funnel_id, created_at")
                                .eq("event_type", "click")
                                .gte("created_at", tenMinutesAgo)
                                .order("created_at", { ascending: false })
                                .limit(5);

                            if (recentClicks && recentClicks.length > 0) {
                                // Buscar funis do bot_id atual
                                const { data: botFunnels } = await supabase
                                    .from("funnels")
                                    .select("id")
                                    .eq("bot_id", bot_id);

                                const botFunnelIds = botFunnels?.map(f => f.id) || [];

                                // Pegar o click mais recente que pertence a um funil deste bot
                                for (const click of recentClicks) {
                                    if (click.funnel_id && botFunnelIds.includes(click.funnel_id)) {
                                        visitorId = click.visitor_id;
                                        funnelId = click.funnel_id;
                                        console.log(`[Webhook] Join Request - ✅ Fallback por click recente: visitor_id=${visitorId}, funnel_id=${funnelId}`);

                                        // Criar registro temporário para poder enviar mensagem
                                        if (!linkData) {
                                            linkData = {
                                                id: null,
                                                visitor_id: visitorId,
                                                funnel_id: funnelId,
                                                welcome_sent_at: null
                                            };
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                if (botData?.bot_token && botData?.chat_id) {
                    // 1. Vincular o usuário imediatamente
                    if (linkData) {
                        await supabase
                            .from("visitor_telegram_links")
                            .update({
                                telegram_user_id: telegramUserId,
                                telegram_username: request.from?.username,
                                linked_at: new Date().toISOString(),
                                metadata: {
                                    ...linkData.metadata,
                                    linked_via: "join_request",
                                    chat_id: botData.chat_id,
                                }
                            })
                            .eq("id", linkData.id);
                        console.log(`[Webhook] Usuário ${telegramUserId} vinculado ao visitor_id ${linkData.visitor_id} via Join Request`);
                    }

                    // 2. Enviar Mensagem de Boas-vindas (ANTES DE APROVAR)
                    // Isso garante que temos permissão para enviar msg para quem pediu para entrar
                    console.log(`[Webhook] Join Request - Verificando condições para enviar boas-vindas:`, {
                        funnelId: funnelId || 'null',
                        linkDataFound: !!linkData,
                        welcomeSentAt: linkData?.welcome_sent_at || 'null'
                    });

                    // Buscar registro atualizado para verificar welcome_sent_at
                    let currentLinkData = linkData;
                    if (linkData?.id) {
                        const { data: updatedLinkData } = await supabase
                            .from("visitor_telegram_links")
                            .select("id, welcome_sent_at")
                            .eq("id", linkData.id)
                            .maybeSingle();
                        if (updatedLinkData) {
                            currentLinkData = { ...linkData, welcome_sent_at: updatedLinkData.welcome_sent_at };
                        }
                    }

                    if (funnelId && !currentLinkData?.welcome_sent_at) {
                        console.log(`[Webhook] Join Request - Condições atendidas. Buscando configurações de boas-vindas para funil ${funnelId}...`);
                        try {
                            const { data: welcomeSettings, error: welcomeError } = await supabase
                                .from("funnel_welcome_settings")
                                .select("*")
                                .eq("funnel_id", funnelId)
                                .eq("is_active", true)
                                .maybeSingle();

                            if (welcomeSettings) {
                                let messageText = welcomeSettings.message_text || "";
                                const firstName = request.from?.first_name || "Visitante";
                                const username = request.from?.username ? `@${request.from.username}` : "";

                                messageText = messageText.replace(/{first_name}/g, firstName).replace(/{username}/g, username);

                                const inlineKeyboard = welcomeSettings.buttons_config?.map((btn: any) => ([
                                    { text: btn.label, url: btn.url }
                                ])) || [];

                                console.log(`[Webhook] Join Request - Enviando mensagem PRE-APROVAÇÃO para: ${telegramUserId}`);

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

                                if (result.ok) {
                                    // Marcar como enviado
                                    const linkIdToUpdate = currentLinkData?.id || linkData?.id;
                                    if (linkIdToUpdate) {
                                        await supabase
                                            .from("visitor_telegram_links")
                                            .update({ welcome_sent_at: new Date().toISOString() })
                                            .eq("id", linkIdToUpdate);
                                    } else if (visitorId && funnelId) {
                                        await supabase
                                            .from("visitor_telegram_links")
                                            .update({ welcome_sent_at: new Date().toISOString() })
                                            .eq("visitor_id", visitorId)
                                            .eq("funnel_id", funnelId);
                                    }
                                    console.log(`[Webhook] ✅ Mensagem de boas-vindas enviada com sucesso (Pré-Aprovação).`);
                                } else {
                                    console.error(`[Webhook] ❌ Erro ao enviar mensagem (Pré-Aprovação):`, result.description);
                                }

                                // Logar envio
                                await supabase.from("telegram_message_logs").insert({
                                    funnel_id: funnelId,
                                    telegram_chat_id: telegramUserId.toString(),
                                    telegram_user_name: username || firstName,
                                    direction: 'outbound',
                                    message_content: messageText,
                                    status: result.ok ? 'sent' : 'failed',
                                    error_message: result.ok ? null : result.description
                                });
                            }
                        } catch (err) {
                            console.error("[Webhook] ❌ Erro ao processar boas-vindas:", err);
                        }
                    }

                    // 3. Aprovar Entrada (AGORA SIM)
                    await fetch(`https://api.telegram.org/bot${botData.bot_token}/approveChatJoinRequest`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: botData.chat_id,
                            user_id: telegramUserId
                        })
                    });
                    console.log(`[Webhook] Auto-aprovado user ${telegramUserId}`);

                    // 4. Revogar o Link de Convite (Limpeza)
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
