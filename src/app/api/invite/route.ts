import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

/**
 * API para gerar links de convite únicos do Telegram
 * 
 * Isso permite rastrear qual visitor_id entrou no canal
 * sem precisar que o usuário inicie conversa com o bot
 * 
 * GET /api/invite?funnel_id=xxx&visitor_id=yyy
 */
export async function GET(request: Request) {
    try {
        const supabase = getSupabaseClient();
        const { searchParams } = new URL(request.url);
        const funnelId = searchParams.get("funnel_id");
        const visitorId = searchParams.get("visitor_id");

        if (!funnelId || !visitorId) {
            return NextResponse.json(
                { error: "funnel_id e visitor_id são obrigatórios" },
                { status: 400 }
            );
        }


        // 1. Buscar dados do funil e suas configurações de boas-vindas
        const { data: funnel, error: funnelError } = await supabase
            .from("funnels")
            .select(`
                id,
                name,
                telegram_bots (
                    id,
                    bot_token,
                    chat_id,
                    channel_link
                ),
                funnel_welcome_settings (
                    is_active
                )
            `)
            .eq("id", funnelId)
            .single();

        if (funnelError || !funnel) {
            console.error("Erro ao buscar funil:", funnelError);
            return NextResponse.json(
                { error: "Funil não encontrado" },
                { status: 404 }
            );
        }

        const bot = funnel.telegram_bots as any;
        const welcomeSettings = funnel.funnel_welcome_settings?.[0]; // Supabase returns array for relations
        const shouldUseJoinRequest = welcomeSettings?.is_active || false;

        if (!bot?.bot_token) {
            return NextResponse.json(
                { error: "Bot não configurado para este funil" },
                { status: 400 }
            );
        }

        if (!bot?.chat_id) {
            // Fallback: retornar o channel_link estático se não tiver chat_id
            if (bot?.channel_link) {
                return NextResponse.json({
                    invite_link: bot.channel_link,
                    is_dynamic: false,
                    message: "Usando link estático (chat_id não configurado)"
                });
            }
            return NextResponse.json(
                { error: "chat_id não configurado. Configure o ID do canal na página de Canais." },
                { status: 400 }
            );
        }

        // 2. Gerar link de convite único usando a API do Telegram
        // O campo "name" permite até 32 caracteres - usamos para armazenar o visitor_id
        // Formato: "v_{primeiros 28 chars do visitor_id}"
        const inviteName = `v_${visitorId.substring(0, 28)}`;

        const telegramPayload: any = {
            chat_id: bot.chat_id,
            name: inviteName,
            expire_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // Expira em 24h
        };

        // Regra: Se "Pedir para Entrar" (join request) estiver ativo, NÃO pode ter member_limit
        // Se NÃO estiver ativo, usamos member_limit: 1 para ser link único de entrada direta
        if (shouldUseJoinRequest) {
            telegramPayload.creates_join_request = true;
        } else {
            telegramPayload.member_limit = 1;
        }

        const telegramResponse = await fetch(
            `https://api.telegram.org/bot${bot.bot_token}/createChatInviteLink`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(telegramPayload)
            }
        );

        const telegramData = await telegramResponse.json();

        if (!telegramData.ok) {
            console.error("Erro Telegram API:", telegramData);

            // Se falhar, tentar retornar o link estático como fallback
            if (bot?.channel_link) {
                return NextResponse.json({
                    invite_link: bot.channel_link,
                    is_dynamic: false,
                    error_detail: telegramData.description,
                    message: "Usando link estático (falha ao gerar link dinâmico)"
                });
            }

            return NextResponse.json(
                { error: `Erro ao gerar link: ${telegramData.description}` },
                { status: 500 }
            );
        }

        const inviteLink = telegramData.result.invite_link;

        // 3. Salvar o mapeamento visitor_id <-> invite_link para referência
        // Isso ajuda na auditoria e fallback se o webhook não receber o invite_link.name
        await supabase.from("visitor_telegram_links").upsert({
            visitor_id: visitorId,
            funnel_id: funnelId,
            bot_id: bot.id,
            telegram_user_id: 0, // Será atualizado quando o usuário entrar
            metadata: {
                invite_link: inviteLink,
                invite_name: inviteName,
                generated_at: new Date().toISOString(),
                type: "dynamic_invite",
                requires_approval: shouldUseJoinRequest
            }
        }, {
            onConflict: "visitor_id,telegram_user_id",
            ignoreDuplicates: false
        });

        return NextResponse.json({
            invite_link: inviteLink,
            is_dynamic: true,
            expires_in: "24h",
            requires_approval: shouldUseJoinRequest
        });

    } catch (error) {
        console.error("Erro na API de invite:", error);
        return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const supabase = getSupabaseClient();
        const body = await request.json();
        const { funnel_id, visitor_id, metadata } = body;

        if (!funnel_id || !visitor_id) {
            return NextResponse.json(
                { error: "funnel_id e visitor_id são obrigatórios" },
                { status: 400 }
            );
        }

        // 1. Registrar evento de Click (Server-Side)
        if (metadata) {
            // Fire & Forget para não bloquear
            supabase.from("events").insert({
                funnel_id,
                visitor_id,
                event_type: "click",
                metadata: {
                    ...metadata,
                    source: "server_api_invite"
                }
            }).then(({ error }) => {
                if (error) console.error("Erro ao salvar click:", error);
            });
        }

        // 2. TENTATIVA RÁPIDA: Pegar do Pool (Zero Latency)
        // Busca 1 link disponível
        const { data: poolLink } = await supabase
            .from("invite_link_pool")
            .select("id, invite_link, invite_name, funnel_id")
            .eq("funnel_id", funnel_id)
            .eq("status", "available")
            .limit(1)
            .maybeSingle();

        if (poolLink) {
            // Marcar como usado IMEDIATAMENTE (Atomicidade otimista)
            const { error: updateError } = await supabase
                .from("invite_link_pool")
                .update({
                    status: 'used',
                    used_at: new Date().toISOString()
                })
                .eq("id", poolLink.id)
                .eq("status", "available"); // Garante que ninguém roubou o link no meio tempo

            if (!updateError) {
                // SUCESSO! Temos um link em < 50ms

                // Precisamos do bot_id para o vínculo. Buscamos rápido.
                const { data: funnelBot } = await supabase
                    .from("funnels")
                    .select("telegram_bots(id)")
                    .eq("id", funnel_id)
                    .single();

                const botId = (funnelBot?.telegram_bots as any)?.id;

                // Vincular ao visitor
                await supabase.from("visitor_telegram_links").upsert({
                    visitor_id: visitor_id,
                    funnel_id,
                    bot_id: botId,
                    telegram_user_id: 0,
                    metadata: {
                        invite_link: poolLink.invite_link,
                        invite_name: poolLink.invite_name,
                        generated_at: new Date().toISOString(),
                        type: "pool_invite",
                        source: "pool"
                    }
                }, { onConflict: "visitor_id,telegram_user_id" });

                return NextResponse.json({
                    invite_link: poolLink.invite_link,
                    is_dynamic: true,
                    source: "pool", // Debug info
                    expires_in: "7d"
                });
            }
        }

        // 3. FALLBACK: Se não tiver no pool, gera na hora (Lógica Original)
        console.log(`[Invite API] Pool vazio ou falha para funil ${funnel_id}. Gerando on-demand...`);

        const { data: funnel, error: funnelError } = await supabase
            .from("funnels")
            .select(`
                id,
                name,
                telegram_bots (
                    id,
                    bot_token,
                    chat_id,
                    channel_link
                ),
                funnel_welcome_settings (
                    is_active
                )
            `)
            .eq("id", funnel_id)
            .single();

        if (funnelError || !funnel) {
            return NextResponse.json({ error: "Funil não encontrado" }, { status: 404 });
        }

        const bot = funnel.telegram_bots as any;
        const welcomeSettings = funnel.funnel_welcome_settings?.[0]; // Supabase returns array for relations
        const shouldUseJoinRequest = welcomeSettings?.is_active || false;

        if (!bot?.bot_token) {
            return NextResponse.json({ error: "Bot não configurado" }, { status: 400 });
        }

        if (!bot?.chat_id) {
            if (bot?.channel_link) {
                return NextResponse.json({
                    invite_link: bot.channel_link,
                    is_dynamic: false,
                    message: "Usando link estático (chat_id não configurado)"
                });
            }
            return NextResponse.json({ error: "chat_id não configurado" }, { status: 400 });
        }

        // 3. Gerar Invite Link (Telegram API)
        const inviteName = `v_${visitor_id.substring(0, 28)}`;

        const telegramPayload: any = {
            chat_id: bot.chat_id,
            name: inviteName,
            expire_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };

        if (shouldUseJoinRequest) {
            telegramPayload.creates_join_request = true;
        } else {
            telegramPayload.member_limit = 1;
        }

        const telegramResponse = await fetch(
            `https://api.telegram.org/bot${bot.bot_token}/createChatInviteLink`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(telegramPayload)
            }
        );

        const telegramData = await telegramResponse.json();

        if (!telegramData.ok) {
            console.error("Erro Telegram API (POST invite):", telegramData);
            if (bot?.channel_link) {
                return NextResponse.json({
                    invite_link: bot.channel_link,
                    is_dynamic: false,
                    error_detail: telegramData.description,
                    message: "Fallback link estático"
                });
            }
            return NextResponse.json({ error: `Erro Telegram: ${telegramData.description}` }, { status: 500 });
        }

        const inviteLink = telegramData.result.invite_link;

        // 4. Salvar vínculo visitor <-> telegram
        await supabase.from("visitor_telegram_links").upsert({
            visitor_id: visitor_id,
            funnel_id,
            bot_id: bot.id,
            telegram_user_id: 0,
            metadata: {
                invite_link: inviteLink,
                invite_name: inviteName,
                generated_at: new Date().toISOString(),
                type: "dynamic_invite_post",
                requires_approval: shouldUseJoinRequest
            }
        }, { onConflict: "visitor_id,telegram_user_id" });

        return NextResponse.json({
            invite_link: inviteLink,
            is_dynamic: true,
            expires_in: "24h",
            requires_approval: shouldUseJoinRequest
        });

    } catch (error) {
        console.error("Erro na API de invite (POST):", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
