"use server";

export interface TelegramWebhookResult {
    ok: boolean;
    description?: string;
    result?: any;
}

export async function setTelegramWebhook(botToken: string, webhookUrl: string): Promise<TelegramWebhookResult> {
    try {
        console.log(`Setting webhook for bot to: ${webhookUrl}`);
        
        // Telegram API requires HTTPS for webhooks (except for self-signed, but standard is HTTPS)
        // It also rejects localhost/127.0.0.1
        if (webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1")) {
            return {
                ok: false,
                description: "Telegram Webhook requires a public HTTPS URL. It does not work with localhost. Use ngrok or deploy your app."
            };
        }

        const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: [
                    "message",
                    "chat_member",
                    "chat_join_request",
                    "my_chat_member"
                ],
                drop_pending_updates: true
            })
        });

        const data = await response.json();
        return data as TelegramWebhookResult;

    } catch (error: any) {
        console.error("Error setting webhook:", error);
        return {
            ok: false,
            description: error.message || "Failed to connect to Telegram API"
        };
    }
}

export async function deleteTelegramWebhook(botToken: string): Promise<TelegramWebhookResult> {
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
            method: 'POST'
        });
        const data = await response.json();
        return data as TelegramWebhookResult;
    } catch (error: any) {
        return {
            ok: false,
            description: error.message
        };
    }
}

export async function getTelegramBotStatus(botToken: string) {
    try {
        const [meRes, webhookRes] = await Promise.all([
            fetch(`https://api.telegram.org/bot${botToken}/getMe`),
            fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
        ]);

        const me = await meRes.json();
        const webhook = await webhookRes.json();

        return {
            ok: true,
            bot: me.result,
            webhook: webhook.result
        };
    } catch (error: any) {
        return { ok: false, description: error.message };
    }
}
