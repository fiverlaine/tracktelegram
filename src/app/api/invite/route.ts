import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase client com service role para bypass de RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
        const { searchParams } = new URL(request.url);
        const funnelId = searchParams.get("funnel_id");
        const visitorId = searchParams.get("visitor_id");

        if (!funnelId || !visitorId) {
            return NextResponse.json(
                { error: "funnel_id e visitor_id são obrigatórios" },
                { status: 400 }
            );
        }

        // 1. Buscar dados do funil (bot_token e chat_id)
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

        const telegramResponse = await fetch(
            `https://api.telegram.org/bot${bot.bot_token}/createChatInviteLink`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: bot.chat_id,
                    name: inviteName,
                    member_limit: 1, // Link de uso único
                    expire_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // Expira em 24h
                })
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
                type: "dynamic_invite"
            }
        }, { 
            onConflict: "visitor_id,telegram_user_id",
            ignoreDuplicates: false 
        });

        return NextResponse.json({
            invite_link: inviteLink,
            is_dynamic: true,
            expires_in: "24h"
        });

    } catch (error) {
        console.error("Erro na API de invite:", error);
        return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}
