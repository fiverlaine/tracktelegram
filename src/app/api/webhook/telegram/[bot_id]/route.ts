import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MessageHandler } from "@/services/telegram/message-handler";
import { JoinHandler } from "@/services/telegram/join-handler";

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

        const messageHandler = new MessageHandler(supabase);
        const joinHandler = new JoinHandler(supabase);

        // 1. Handle Messages (Text & Commands)
        if (update.message) {
            await messageHandler.handleMessage(update, bot_id);
        }

        // 2. Handle Chat Member (Join/Leave)
        if (update.chat_member || update.my_chat_member) {
            await joinHandler.handleChatMember(update, bot_id);
        }

        // 3. Handle Join Request
        if (update.chat_join_request) {
            await joinHandler.handleJoinRequest(update, bot_id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Webhook] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: "active", service: "TrackGram Webhook v3.2 (Refactored)" });
}
