import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Configuração para não cachear e permitir execução longa se necessário
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos (limite Vercel Hobby/Pro varia, mas ajuda)

export async function GET(request: Request) {
    // Segurança: Verificar chave secreta (Recomendado configurar CRON_SECRET na Vercel)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Buscar todos os funis ativos que têm bot configurado
        const { data: funnels, error: funnelsError } = await supabase
            .from("funnels")
            .select(`
                id, 
                name,
                telegram_bots (
                    id, 
                    bot_token, 
                    chat_id
                )
            `);

        if (funnelsError || !funnels) {
            return NextResponse.json({ error: "Erro ao buscar funis", details: funnelsError }, { status: 500 });
        }

        const results = [];

        // 2. Para cada funil, verificar e repopular o pool
        for (const funnel of funnels) {
            const bot = funnel.telegram_bots as any;

            // Pular se não tiver bot configurado corretamente
            if (!bot?.bot_token || !bot?.chat_id) {
                results.push({ funnel: funnel.name, status: "skipped_no_bot_config" });
                continue;
            }

            // Verificar quantos links disponíveis existem
            const { count, error: countError } = await supabase
                .from("invite_link_pool")
                .select("*", { count: 'exact', head: true })
                .eq("funnel_id", funnel.id)
                .eq("status", "available");

            if (countError) {
                console.error(`Erro ao contar pool para funil ${funnel.id}:`, countError);
                continue;
            }

            const currentCount = count || 0;
            const TARGET_POOL_SIZE = 20; // Manter 20 links prontos por funil (ajuste conforme necessidade)
            const needed = TARGET_POOL_SIZE - currentCount;

            if (needed > 0) {
                console.log(`[Pool] Gerando ${needed} links para funil ${funnel.name} (${funnel.id})`);

                // Gerar links em lote (limitado a 5 por execução para evitar timeout/rate-limit)
                const batchSize = Math.min(needed, 5);
                let generatedCount = 0;

                for (let i = 0; i < batchSize; i++) {
                    const uniqueId = crypto.randomUUID();
                    // Prefixo 'pool_' para diferenciar no webhook
                    const inviteName = `pool_${uniqueId.substring(0, 20)}`;

                    try {
                        // Chamada Telegram API
                        const response = await fetch(
                            `https://api.telegram.org/bot${bot.bot_token}/createChatInviteLink`,
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    chat_id: bot.chat_id,
                                    name: inviteName,
                                    member_limit: 1, // Link descartável (uso único)
                                    // Expira em 7 dias (tempo suficiente para ser usado)
                                    expire_date: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
                                })
                            }
                        );

                        const data = await response.json();

                        if (data.ok && data.result) {
                            // Salvar no Pool
                            await supabase.from("invite_link_pool").insert({
                                funnel_id: funnel.id,
                                invite_link: data.result.invite_link,
                                invite_name: inviteName,
                                status: 'available'
                            });
                            generatedCount++;
                        } else {
                            console.error(`Erro Telegram para funil ${funnel.name}:`, data);
                        }
                    } catch (err) {
                        console.error("Erro ao gerar link para pool:", err);
                    }

                    // Pequeno delay para evitar rate limit do Telegram (30 req/seg max, mas bom ser gentil)
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                results.push({ funnel: funnel.name, generated: generatedCount, target: TARGET_POOL_SIZE });
            } else {
                results.push({ funnel: funnel.name, status: "pool_full", count: currentCount });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error("Erro crítico no Cron Job:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
