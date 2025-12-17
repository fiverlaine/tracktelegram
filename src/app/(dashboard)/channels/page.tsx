"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Bot, CheckCircle2, AlertTriangle, ExternalLink, Zap, Copy, Info, XCircle, RefreshCw, Save, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useSubscription } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";
import { getPlanLimits } from "@/config/subscription-plans";
import { createChannel, updateChannel } from "@/app/actions/channels";

interface TelegramBot {
    id: string;
    name: string;
    bot_token: string;
    channel_link: string;
    username: string | null;
    chat_id: string | null;
    created_at: string;
}

interface WebhookStatus {
    isSet: boolean;
    url: string | null;
    pendingUpdates: number;
}

interface BotStatus {
    isValid: boolean;
    username: string | null;
    firstName: string | null;
    canReadMessages: boolean;
}

interface ChannelStatus {
    isConnected: boolean;
    chatType: string | null;
    chatTitle: string | null;
    memberCount: number | null;
    botIsAdmin: boolean;
}

interface IntegrationStatus {
    bot: BotStatus;
    channel: ChannelStatus;
    webhook: WebhookStatus;
}

export default function ChannelsPage() {
    const [bots, setBots] = useState<TelegramBot[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", bot_token: "", channel_link: "", username: "", chat_id: "" });
    const [saving, setSaving] = useState(false);
    const [activating, setActivating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, IntegrationStatus>>({});
    const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

    const [chatIdInput, setChatIdInput] = useState<Record<string, string>>({});
    const [savingChatId, setSavingChatId] = useState<string | null>(null);
    const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
    const [editingId, setEditingId] = useState<string | null>(null);

    const { isSubscribed, isLoading: subLoading, plan: planName } = useSubscription();
    const router = useRouter();
    const planLimits = getPlanLimits(planName);

    const supabase = createClient();

    const handleEdit = (bot: TelegramBot) => {
        setEditingId(bot.id);
        setFormData({
            name: bot.name,
            bot_token: bot.bot_token,
            channel_link: bot.channel_link,
            username: bot.username || "",
            chat_id: bot.chat_id || ""
        });
        setOpen(true);
    };

    const getWebhookBaseUrl = () => {
        // Prioritize Environment Variable which should be the public URL
        if (process.env.NEXT_PUBLIC_APP_URL) {
            return process.env.NEXT_PUBLIC_APP_URL;
        }
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return 'https://tracktelegram.vercel.app';
    };

    const WEBHOOK_BASE_URL = getWebhookBaseUrl();

    useEffect(() => {
        fetchBots();
    }, []);

    async function fetchBots() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("telegram_bots")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            toast.error("Erro ao carregar canais");
        } else {
            setBots(data || []);
            for (const bot of data || []) {
                // Background check without blocking UI
                checkIntegrationStatus(bot);
            }
        }
        setLoading(false);
    }

    async function checkIntegrationStatus(bot: TelegramBot) {
        setCheckingStatus(bot.id);

        const status: IntegrationStatus = {
            bot: { isValid: false, username: null, firstName: null, canReadMessages: false },
            channel: { isConnected: false, chatType: null, chatTitle: null, memberCount: null, botIsAdmin: false },
            webhook: { isSet: false, url: null, pendingUpdates: 0 }
        };

        try {
            // 1. Verificar Bot (getMe)
            const botRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getMe`);
            const botData = await botRes.json();

            let botUserId: number | null = null;

            if (botData.ok) {
                status.bot.isValid = true;
                status.bot.username = botData.result.username;
                status.bot.firstName = botData.result.first_name;
                status.bot.canReadMessages = botData.result.can_read_all_group_messages || false;
                botUserId = botData.result.id;

                if (botData.result.username && botData.result.username !== bot.username) {
                    await supabase
                        .from("telegram_bots")
                        .update({ username: botData.result.username })
                        .eq("id", bot.id);

                    setBots(prev => prev.map(b =>
                        b.id === bot.id ? { ...b, username: botData.result.username } : b
                    ));
                }
            }

            // 2. Verificar Webhook
            const webhookRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getWebhookInfo`);
            const webhookData = await webhookRes.json();

            const hasWebhook = webhookData.ok && !!webhookData.result.url;

            if (webhookData.ok) {
                status.webhook.isSet = hasWebhook;
                status.webhook.url = webhookData.result.url;
                status.webhook.pendingUpdates = webhookData.result.pending_update_count || 0;
            }

            // 3. Verificar conexão com canal
            if (status.bot.isValid && botUserId) {
                const { data: freshBot } = await supabase
                    .from("telegram_bots")
                    .select("chat_id")
                    .eq("id", bot.id)
                    .single();

                const storedChatId = freshBot?.chat_id;
                let chatId: string | number | null = storedChatId || null;

                if (storedChatId) {
                    chatId = storedChatId;
                } else if (bot.channel_link) {
                    const channelMatch = bot.channel_link.match(/t\.me\/([^\/\?]+)/);
                    if (channelMatch) {
                        const channelIdentifier = channelMatch[1];
                        if (!channelIdentifier.startsWith("+")) {
                            chatId = `@${channelIdentifier}`;
                        } else {
                            status.channel.chatType = "private";
                        }
                    }
                }

                if (chatId) {
                    try {
                        const chatRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChat?chat_id=${chatId}`);
                        const chatData = await chatRes.json();

                        if (chatData.ok) {
                            status.channel.isConnected = true;
                            status.channel.chatType = chatData.result.type;
                            status.channel.chatTitle = chatData.result.title || chatData.result.first_name;

                            const finalChatId = chatData.result.id || chatId;

                            // Always update chat_id if we found it via API to ensure sync
                            if (chatData.result.id && chatData.result.id.toString() !== storedChatId) {
                                await supabase
                                    .from("telegram_bots")
                                    .update({ chat_id: chatData.result.id.toString() })
                                    .eq("id", bot.id);
                            }

                            try {
                                const memberRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChatMember?chat_id=${finalChatId}&user_id=${botUserId}`);
                                const memberData = await memberRes.json();

                                if (memberData.ok) {
                                    const memberStatus = memberData.result.status;
                                    status.channel.botIsAdmin = memberStatus === "creator" || memberStatus === "administrator";
                                    status.channel.isConnected = memberStatus !== "left" && memberStatus !== "kicked";
                                }
                            } catch (e) {
                                // Ignore
                            }

                            if (!status.channel.botIsAdmin) {
                                try {
                                    const adminRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChatAdministrators?chat_id=${finalChatId}`);
                                    const adminData = await adminRes.json();

                                    if (adminData.ok) {
                                        const botAdmin = adminData.result.find((admin: any) =>
                                            admin.user.id === botUserId || admin.user.username === status.bot.username
                                        );
                                        if (botAdmin) {
                                            status.channel.botIsAdmin = true;
                                            status.channel.isConnected = true;
                                        }
                                    }
                                } catch (e) {
                                    // Ignore
                                }
                            }

                            try {
                                const countRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChatMemberCount?chat_id=${finalChatId}`);
                                const countData = await countRes.json();
                                if (countData.ok) {
                                    status.channel.memberCount = countData.result;
                                }
                            } catch (e) {
                                // Ignore
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                } else if (status.channel.chatType === "private") {
                    try {
                        const { data: recentEvents } = await supabase
                            .from("events")
                            .select("metadata, created_at")
                            .eq("event_type", "join")
                            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                            .order("created_at", { ascending: false })
                            .limit(1);

                        if (recentEvents && recentEvents.length > 0) {
                            const metadata = recentEvents[0].metadata as any;

                            if (metadata?.chat_id) {
                                await supabase
                                    .from("telegram_bots")
                                    .update({ chat_id: metadata.chat_id.toString() })
                                    .eq("id", bot.id);

                                try {
                                    const memberRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChatMember?chat_id=${metadata.chat_id}&user_id=${botUserId}`);
                                    const memberData = await memberRes.json();

                                    if (memberData.ok) {
                                        const memberStatus = memberData.result.status;
                                        status.channel.botIsAdmin = memberStatus === "creator" || memberStatus === "administrator";
                                        status.channel.isConnected = memberStatus !== "left" && memberStatus !== "kicked";
                                    }
                                } catch (e) {
                                    // Ignore
                                }

                                if (metadata.chat_title) {
                                    status.channel.chatTitle = metadata.chat_title;
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }

        } catch (e) {
            console.error("Error checking integration status:", e);
        }

        setIntegrationStatuses(prev => ({
            ...prev,
            [bot.id]: status
        }));

        setCheckingStatus(null);
    }


    // ...

    async function handleSave() {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast.error("Login necessário.");
            setSaving(false);
            return;
        }

        if (!formData.name || !formData.bot_token || !formData.channel_link) {
            toast.error("Preencha todos os campos obrigatórios.");
            setSaving(false);
            return;
        }

        toast.info("Validando token do bot...");
        let username = formData.username;

        try {
            const res = await fetch(`https://api.telegram.org/bot${formData.bot_token}/getMe`);
            const data = await res.json();

            if (!data.ok) {
                toast.error("Token do bot inválido. Verifique e tente novamente.");
                setSaving(false);
                return;
            }

            username = data.result.username;
        } catch (e) {
            toast.error("Erro ao validar token do bot.");
            setSaving(false);
            return;
        }

        try {
            if (editingId) {
                await updateChannel(editingId, {
                    name: formData.name,
                    bot_token: formData.bot_token,
                    channel_link: formData.channel_link,
                    username: username,
                    chat_id: formData.chat_id
                });
                toast.success("Canal atualizado com sucesso!");
            } else {
                await createChannel({
                    name: formData.name,
                    bot_token: formData.bot_token,
                    channel_link: formData.channel_link,
                    username: username,
                    chat_id: formData.chat_id
                });
                toast.success("Canal configurado com sucesso!");
            }

            setOpen(false);
            setFormData({ name: "", bot_token: "", channel_link: "", username: "", chat_id: "" });
            setEditingId(null);
            fetchBots();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        }
        setSaving(false);
    }

    async function handleDelete(bot: TelegramBot) {
        if (!confirm(`Tem certeza que deseja remover "${bot.name}"? Esta ação não pode ser desfeita.`)) {
            return;
        }

        setDeleting(bot.id);

        try {
            await fetch(`https://api.telegram.org/bot${bot.bot_token}/deleteWebhook`);
        } catch (e) {
            console.warn("Não foi possível remover webhook:", e);
        }

        const { data: funnels } = await supabase
            .from("funnels")
            .select("id")
            .eq("bot_id", bot.id);

        if (funnels && funnels.length > 0) {
            await supabase
                .from("funnels")
                .update({ bot_id: null })
                .eq("bot_id", bot.id);
        }

        await supabase
            .from("visitor_telegram_links")
            .delete()
            .eq("bot_id", bot.id);

        const { error } = await supabase
            .from("telegram_bots")
            .delete()
            .eq("id", bot.id);

        if (error) {
            console.error(error);
            toast.error("Erro ao deletar: " + error.message);
        } else {
            toast.success("Canal removido com sucesso");
            setBots(prev => prev.filter(b => b.id !== bot.id));
        }

        setDeleting(null);
    }

    async function activateWebhook(bot: TelegramBot) {
        setActivating(bot.id);

        try {
            const webhookUrl = `${WEBHOOK_BASE_URL}/api/webhook/telegram/${bot.id}`;
            const { setTelegramWebhook } = await import("@/app/actions/telegram"); // Dynamic import or top-level import

            const data = await setTelegramWebhook(bot.bot_token, webhookUrl);

            if (data.ok) {
                toast.success("Rastreamento Ativado! Webhook configurado.");
                await checkIntegrationStatus(bot);
            } else {
                toast.error(`Erro Telegram: ${data.description}`);
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Erro de conexão com Telegram.");
        }
        setActivating(null);
    }

    async function deactivateWebhook(bot: TelegramBot) {
        setActivating(bot.id);

        try {
            const { deleteTelegramWebhook } = await import("@/app/actions/telegram");
            const data = await deleteTelegramWebhook(bot.bot_token);

            if (data.ok) {
                toast.success("Webhook desativado.");
                await checkIntegrationStatus(bot);
            } else {
                toast.error(`Erro: ${data.description}`);
            }
        } catch (e) {
            toast.error("Erro de conexão.");
        }
        setActivating(null);
    }

    async function saveChatId(bot: TelegramBot) {
        const inputChatId = chatIdInput[bot.id]?.trim();

        if (!inputChatId) {
            toast.error("Digite o ID do canal.");
            return;
        }

        if (!/^-?\d+$/.test(inputChatId)) {
            toast.error("ID inválido. O ID deve ser um número (ex: -1002406299839)");
            return;
        }

        setSavingChatId(bot.id);

        try {
            const chatRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChat?chat_id=${inputChatId}`);
            const chatData = await chatRes.json();

            if (!chatData.ok) {
                toast.error(`ID inválido: ${chatData.description || "Canal não encontrado"}`);
                setSavingChatId(null);
                return;
            }

            const { error } = await supabase
                .from("telegram_bots")
                .update({ chat_id: inputChatId })
                .eq("id", bot.id);

            if (error) {
                toast.error("Erro ao salvar ID do canal.");
            } else {
                toast.success(`Canal vinculado: ${chatData.result.title || inputChatId}`);

                setBots(prev => prev.map(b =>
                    b.id === bot.id ? { ...b, chat_id: inputChatId } : b
                ));

                setChatIdInput(prev => ({ ...prev, [bot.id]: "" }));
                await checkIntegrationStatus(bot);
            }
        } catch (e) {
            console.error("Erro ao salvar chat_id:", e);
            toast.error("Erro de conexão.");
        }

        setSavingChatId(null);
    }

    function StatusItem({
        status,
        title,
        description,
        type = "error"
    }: {
        status: boolean;
        title: string;
        description: string;
        type?: "success" | "error" | "warning"
    }) {
        const colors = {
            success: { bg: "bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", text: "text-emerald-600 dark:text-emerald-400" },
            error: { bg: "bg-red-500/10", icon: "text-red-500 dark:text-red-400", text: "text-red-500 dark:text-red-400" },
            warning: { bg: "bg-amber-500/10", icon: "text-amber-500 dark:text-amber-400", text: "text-amber-500 dark:text-amber-400" }
        };

        const color = status ? colors.success : colors[type];
        const Icon = status ? CheckCircle2 : type === "warning" ? AlertTriangle : XCircle;

        return (
            <div className="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-white/5 rounded-lg border border-neutral-200 dark:border-white/5">
                <div className={`h-8 w-8 rounded-full ${color.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${color.icon}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{title}</p>
                    <p className={`text-xs ${status ? "text-emerald-600 dark:text-emerald-400" : color.text}`}>
                        {description}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Meus Canais" description="Conecte seu Canal ou Grupo do Telegram para rastrear membros e enviar notificações.">
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-white/5 rounded-full border border-neutral-200 dark:border-white/10 text-xs text-neutral-500 dark:text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${isSubscribed ? "bg-violet-500" : "bg-neutral-400 dark:bg-gray-500"} animate-pulse`} />
                        {!isSubscribed
                            ? "0 / 0 canais"
                            : planLimits?.channels === 9999
                                ? "Ilimitado"
                                : `${bots.length} / ${planLimits?.channels || 0} canais`}
                    </div>
                </div>

                <Button
                    onClick={() => {
                        if (subLoading) return;
                        if (!isSubscribed) {
                            toast.error("Assine um plano para adicionar canais.");
                            router.push("/subscription");
                            return;
                        }

                        if (planLimits && planLimits.channels !== 9999 && bots.length >= planLimits.channels) {
                            toast.error(`Seu plano permite apenas ${planLimits.channels} canais. Faça upgrade para adicionar mais.`);
                            router.push("/subscription");
                            return;
                        }

                        setEditingId(null);
                        setFormData({ name: "", bot_token: "", channel_link: "", username: "", chat_id: "" });
                        setOpen(true);
                    }}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 gap-2 font-bold"
                >
                    <Plus className="h-4 w-4" />
                    Adicionar Canal
                </Button>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white">
                        <DialogHeader>
                            <DialogTitle className="text-neutral-900 dark:text-white">Configurar Novo Canal</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5 p-3 rounded text-xs text-neutral-500 dark:text-gray-400 mb-2">
                                <p className="font-bold text-neutral-900 dark:text-white mb-1">Instruções:</p>
                                <ol className="list-decimal pl-4 space-y-1">
                                    <li>Crie um Bot no <strong>@BotFather</strong>.</li>
                                    <li>Crie um Canal ou Grupo no Telegram.</li>
                                    <li><strong>Adicione o Bot como Administrador</strong> do seu Canal/Grupo.</li>
                                    <li>Cole o Token do Bot e o Link de Convite do Canal abaixo.</li>
                                </ol>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-neutral-500 dark:text-gray-400">Nome do Canal</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Ofertas VIP"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-neutral-100 dark:bg-black/40 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-gray-700"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="token" className="text-neutral-500 dark:text-gray-400">Token do Bot (BotFather)</Label>
                                <Input
                                    id="token"
                                    placeholder="123456:ABC-DEF..."
                                    value={formData.bot_token}
                                    onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
                                    className="bg-neutral-100 dark:bg-black/40 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-gray-700 font-mono"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="link" className="text-neutral-500 dark:text-gray-400">Link do Canal (Destino Final)</Label>
                                <Input
                                    id="link"
                                    placeholder="https://t.me/+AbCdEfGhIj..."
                                    value={formData.channel_link}
                                    onChange={(e) => setFormData({ ...formData, channel_link: e.target.value })}
                                    className="bg-neutral-100 dark:bg-black/40 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-gray-700"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="chat_id" className="text-neutral-500 dark:text-gray-400">ID do Canal/Grupo (Opcional)</Label>
                                <Input
                                    id="chat_id"
                                    placeholder="-1001234567890"
                                    value={formData.chat_id}
                                    onChange={(e) => setFormData({ ...formData, chat_id: e.target.value })}
                                    className="bg-neutral-100 dark:bg-black/40 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-gray-700 font-mono"
                                />
                                <p className="text-[10px] text-neutral-500 dark:text-gray-500">
                                    Insira o ID se já souber (ex: -100...), ou deixe vazio para detectar depois.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent border-white/10 hover:bg-white/5 text-gray-400">Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar e Validar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            {/* Table Header */}
            <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-4 gap-4 p-4 border-b border-neutral-100 dark:border-white/5 text-xs font-medium text-neutral-500 dark:text-gray-500 uppercase">
                    <div>NOME DO CANAL</div>
                    <div>NOME DO BOT</div>
                    <div>TOKEN</div>
                    <div className="text-right">AÇÕES</div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin text-violet-500" />
                    </div>
                ) : bots.length === 0 ? (
                    <div className="text-center p-8 text-neutral-500 dark:text-gray-500 border-t border-neutral-100 dark:border-white/5">
                        Nenhum bot configurado.
                    </div>
                ) : (
                    bots.map(bot => {
                        const status = integrationStatuses[bot.id];

                        return (
                            <div key={bot.id} className="grid grid-cols-4 gap-4 p-4 border-b border-neutral-100 dark:border-white/5 items-center hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors group text-neutral-700 dark:text-gray-300 last:border-0">
                                <div className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                    {bot.name}
                                </div>
                                <div className="text-sm">
                                    {status?.bot?.username ? `@${status.bot.username}` : bot.username ? `@${bot.username}` : "—"}
                                </div>
                                <div className="font-mono text-xs text-neutral-500 dark:text-gray-500">
                                    {bot.bot_token.substring(0, 15)}...
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <Dialog open={detailsOpen[bot.id] || false} onOpenChange={(open) => setDetailsOpen(prev => ({ ...prev, [bot.id]: open }))}>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white text-neutral-400 dark:text-gray-400"
                                                title="Ver detalhes"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[700px] bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2 text-neutral-900 dark:text-white">
                                                    <Bot className="h-5 w-5 text-violet-500" />
                                                    Detalhes: {bot.name}
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-6 py-4">
                                                {(() => {
                                                    const status = integrationStatuses[bot.id];
                                                    const expectedWebhookPath = `/api/webhook/telegram/${bot.id}`;
                                                    const isWebhookCorrect = !!(status?.webhook?.isSet &&
                                                        status?.webhook?.url?.includes(expectedWebhookPath));

                                                    return (
                                                        <>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-4">
                                                                    {/* Status do Bot */}
                                                                    <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-lg p-4 space-y-3">
                                                                        <h4 className="font-semibold text-center mb-4 text-neutral-900 dark:text-white">Status do Bot</h4>

                                                                        <StatusItem
                                                                            status={isWebhookCorrect}
                                                                            title="Conexão com a TrackGram"
                                                                            description={isWebhookCorrect ? "Conectado e rastreando!" : "Não encontrada! Ative o rastreamento."}
                                                                            type="error"
                                                                        />

                                                                        <StatusItem
                                                                            status={status?.channel?.botIsAdmin || false}
                                                                            title="Conexão com o Canal"
                                                                            description={status?.channel?.botIsAdmin ? "Bot é administrador do canal." : "Não encontrada! Insira o ID do canal abaixo."}
                                                                            type="error"
                                                                        />

                                                                        {/* Input para ID do Canal */}
                                                                        {!status?.channel?.botIsAdmin && (
                                                                            <div className="space-y-2">
                                                                                <div className="flex gap-2">
                                                                                    <Input
                                                                                        placeholder="-1002406299839"
                                                                                        value={chatIdInput[bot.id] || ""}
                                                                                        onChange={(e) => setChatIdInput(prev => ({ ...prev, [bot.id]: e.target.value }))}
                                                                                        className="text-xs h-8 bg-neutral-100 dark:bg-black/40 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white"
                                                                                    />
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 text-emerald-600 dark:text-emerald-400 h-8 px-3"
                                                                                        onClick={() => saveChatId(bot)}
                                                                                        disabled={savingChatId === bot.id}
                                                                                    >
                                                                                        {savingChatId === bot.id ? (
                                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                                        ) : (
                                                                                            <Save className="h-4 w-4" />
                                                                                        )}
                                                                                    </Button>
                                                                                </div>
                                                                                <p className="text-[10px] text-neutral-500 dark:text-gray-500">
                                                                                    Cole o ID do canal (ex: -1002406299839).
                                                                                    <a
                                                                                        href="https://t.me/getidsbot"
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
                                                                                    >
                                                                                        Use @getidsbot
                                                                                    </a>
                                                                                </p>
                                                                            </div>
                                                                        )}

                                                                        {/* Botão de ativar/desativar */}
                                                                        <div className="pt-2">
                                                                            {isWebhookCorrect ? (
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="w-full border-red-500/20 hover:bg-red-500/10 text-red-600 dark:text-red-500 bg-transparent"
                                                                                    onClick={() => {
                                                                                        deactivateWebhook(bot);
                                                                                        setTimeout(() => checkIntegrationStatus(bot), 1000);
                                                                                    }}
                                                                                    disabled={activating === bot.id}
                                                                                >
                                                                                    {activating === bot.id ? (
                                                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                                    ) : (
                                                                                        <Zap className="h-4 w-4 mr-2" />
                                                                                    )}
                                                                                    Desativar Rastreamento
                                                                                </Button>
                                                                            ) : (
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                                                                                    onClick={() => {
                                                                                        activateWebhook(bot);
                                                                                        setTimeout(() => checkIntegrationStatus(bot), 1000);
                                                                                    }}
                                                                                    disabled={activating === bot.id}
                                                                                >
                                                                                    {activating === bot.id ? (
                                                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                                    ) : (
                                                                                        <Zap className="h-4 w-4 mr-2" />
                                                                                    )}
                                                                                    Ativar Rastreamento
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Detalhes do Webhook */}
                                                                    <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-lg p-4 space-y-3">
                                                                        <h4 className="font-semibold text-center mb-4 text-neutral-900 dark:text-white">Detalhes da Integração</h4>

                                                                        <div className="space-y-2 text-xs">
                                                                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-white/5">
                                                                                <span className="text-neutral-500 dark:text-gray-400">Tipo de Chat:</span>
                                                                                <span className="text-neutral-900 dark:text-white font-mono">{status?.channel?.chatType || "Desconhecido"}</span>
                                                                            </div>
                                                                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-white/5">
                                                                                <span className="text-neutral-500 dark:text-gray-400">Título:</span>
                                                                                <span className="text-neutral-900 dark:text-white">{status?.channel?.chatTitle || "—"}</span>
                                                                            </div>
                                                                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-white/5">
                                                                                <span className="text-neutral-500 dark:text-gray-400">Membros:</span>
                                                                                <span className="text-neutral-900 dark:text-white font-mono">{status?.channel?.memberCount || "—"}</span>
                                                                            </div>
                                                                            <div className="flex justify-between py-1 border-b border-neutral-200 dark:border-white/5">
                                                                                <span className="text-neutral-500 dark:text-gray-400">Pending Updates:</span>
                                                                                <span className="text-neutral-900 dark:text-white font-mono">{status?.webhook?.pendingUpdates || 0}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="pt-2">
                                                                            <Label className="text-xs text-neutral-500 dark:text-gray-400 mb-1 block">Webhook URL (Registrada no Telegram)</Label>
                                                                            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-black/40 p-2 rounded border border-neutral-200 dark:border-white/5">
                                                                                <code className="text-[10px] text-neutral-500 dark:text-gray-400 break-all flex-1 font-mono">
                                                                                    {status?.webhook?.url || "Nenhuma URL registrada"}
                                                                                </code>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-5 w-5 text-neutral-400 dark:text-gray-500 hover:text-neutral-900 dark:hover:text-white"
                                                                                    onClick={() => {
                                                                                        navigator.clipboard.writeText(status?.webhook?.url || "");
                                                                                        toast.success("URL copiada!");
                                                                                    }}
                                                                                >
                                                                                    <Copy className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Status do Canal */}
                                                                <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-lg p-4 space-y-3 h-fit">
                                                                    <h4 className="font-semibold text-center mb-4 text-neutral-900 dark:text-white">Status do Canal</h4>

                                                                    <StatusItem
                                                                        status={status?.channel?.chatType !== "private"}
                                                                        title="Tipo do Canal"
                                                                        description={
                                                                            status?.channel?.chatType === "private"
                                                                                ? "Privado! Recomendamos canal privado."
                                                                                : status?.channel?.chatType
                                                                                    ? `${status.channel.chatType === "channel" ? "Canal" : "Grupo"} ${status.channel.chatTitle || ""}`
                                                                                    : "Não identificado"
                                                                        }
                                                                        type="warning"
                                                                    />

                                                                    <StatusItem
                                                                        status={true}
                                                                        title="Verificação de interferências"
                                                                        description="Nenhuma interferência detectada."
                                                                        type="success"
                                                                    />

                                                                    {status?.channel?.memberCount && (
                                                                        <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                                            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                                                <Info className="h-4 w-4 text-blue-500" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">Membros no Canal</p>
                                                                                <p className="text-xs text-blue-600 dark:text-blue-400">{status.channel.memberCount} membros</p>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Link do canal */}
                                                                    {bot.channel_link && (
                                                                        <a
                                                                            href={bot.channel_link}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center justify-center gap-2 p-2 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 rounded text-neutral-500 dark:text-gray-300 text-sm transition-colors"
                                                                        >
                                                                            <ExternalLink className="h-4 w-4" />
                                                                            Abrir Canal no Telegram
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Botão de atualizar status */}
                                                            <div className="flex justify-center mt-6">
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => checkIntegrationStatus(bot)}
                                                                    disabled={checkingStatus === bot.id}
                                                                    className="border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-600 dark:text-gray-400"
                                                                >
                                                                    {checkingStatus === bot.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                    ) : (
                                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                                    )}
                                                                    Atualizar Status
                                                                </Button>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="hover:bg-white/10 hover:text-white text-gray-400"
                                        onClick={() => handleEdit(bot)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                                        onClick={() => handleDelete(bot)}
                                        disabled={deleting === bot.id}
                                    >
                                        {deleting === bot.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex gap-3 text-amber-500/80 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
                <p>
                    <span className="font-semibold text-amber-500">Importante:</span> Para garantir o correto funcionamento, o bot configurado para a TrackGram não deve ser utilizado simultaneamente em outras plataformas ou para outras finalidades. O uso indevido pode causar interferências e comprometer as funcionalidades da TrackGram
                </p>
            </div>
        </div>
    );
}
