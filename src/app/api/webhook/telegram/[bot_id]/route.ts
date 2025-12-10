
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCAPIEvent } from "@/lib/facebook-capi";

// Initialize Supabase Client (Server-Side with Service Role if available)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
    request: Request,
    { params }: { params: Promise<{ bot_id: string }> }
) {
    try {
        const { bot_id } = await params;
        const update = await request.json();

        console.log(`Webhook received for bot ${bot_id}:`, JSON.stringify(update, null, 2));

        // 1. Handle /start command (Deep Linking)
        // Format: /start <visitor_id>
        if (update.message?.text?.startsWith("/start ")) {
            const args = update.message.text.split(" ");
            if (args.length > 1) {
                const visitorId = args[1].trim();
                const telegramUserId = update.message.from.id;
                const telegramUsername = update.message.from.username;

                console.log(`Linking Visitor ${visitorId} to Telegram ID ${telegramUserId}`);

                // Find funnel associated with this visitor (optional, but good for completeness)
                // We'll just upsert the link for now.
                // Assuming we can find the funnel later via the bot_id join or visitor_id logic

                // Get Funnel ID associated with this Bot (Simplified)
                const { data: botData } = await supabase
                    .from("funnels")
                    .select(`
                        id,
                        telegram_bots (
                            token,
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
                }, { onConflict: 'visitor_id' }); // Or onConflict: telegram_user_id depending on logic.

                // Responder ao usuário com o link do canal
                const botRelation: any = botData?.telegram_bots;
                const botToken = Array.isArray(botRelation) ? botRelation[0]?.token : botRelation?.token;
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

        // 2. Handle Chat Member Updates (Join/Leave)
        const chatMember = update.chat_member || update.my_chat_member;

        if (chatMember) {
            const newStatus = chatMember.new_chat_member?.status;
            const oldStatus = chatMember.old_chat_member?.status;
            const telegramUserId = chatMember.new_chat_member?.user?.id || chatMember.from?.id;

            // Check if it's a "Join" event
            // 'member', 'creator', 'administrator' are joined states. 'left', 'kicked' are left.
            const isJoin = ['member', 'creator', 'administrator'].includes(newStatus) &&
                !['member', 'creator', 'administrator'].includes(oldStatus);

            if (isJoin) {
                console.log(`User ${telegramUserId} Joined! Processing CAPI...`);

                // A. Find the Visitor ID linked to this Telegram User
                const { data: linkData, error: linkError } = await supabase
                    .from("visitor_telegram_links")
                    .select("visitor_id, funnel_id")
                    .eq("telegram_user_id", telegramUserId)
                    .order("linked_at", { ascending: false })
                    .limit(1)
                    .single();

                if (linkData) {
                    const { visitor_id, funnel_id } = linkData;

                    // B. Get Pixel & Access Token for this Funnel
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
                        .eq("id", funnel_id)
                        .single();

                    // C. Get Visitor Metadata from Events (User Agent, FBC, IP)
                    // We take the most recent click or pageview
                    const { data: eventData } = await supabase
                        .from("events")
                        .select("metadata")
                        .eq("visitor_id", visitor_id)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                    if (funnelData?.pixels && eventData?.metadata) {
                        const pixel: any = Array.isArray(funnelData.pixels) ? funnelData.pixels[0] : funnelData.pixels;
                        const metadata = eventData.metadata;

                        // D. Send to Facebook CAPI
                        await sendCAPIEvent(
                            pixel.access_token,
                            pixel.pixel_id,
                            "Lead", // Or "CompleteRegistration"
                            {
                                fbc: metadata.fbc,
                                fbp: metadata.fbp,
                                user_agent: metadata.user_agent,
                                ip_address: metadata.ip_address || "0.0.0.0", // metadata from ClientTracking might not have IP
                                external_id: visitor_id
                            },
                            {
                                content_name: funnelData.name
                            }
                        );

                        // E. Log the "Join" event in our DB
                        await supabase.from("events").insert({
                            funnel_id: funnel_id,
                            visitor_id: visitor_id,
                            event_type: "join",
                            metadata: {
                                source: "telegram_webhook",
                                telegram_user_id: telegramUserId
                            }
                        });
                    }
                } else {
                    console.log(`No visitor link found for Telegram ID ${telegramUserId}`);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: "active", service: "TrackGram Webhook" });
}
