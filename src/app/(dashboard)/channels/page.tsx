"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Bot, CheckCircle2, AlertTriangle, ExternalLink, Zap, Copy, Check, Info, XCircle, RefreshCw, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    const [formData, setFormData] = useState({ name: "", bot_token: "", channel_link: "", username: "" });
    const [saving, setSaving] = useState(false);
    const [activating, setActivating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, IntegrationStatus>>({});
    const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [chatIdInput, setChatIdInput] = useState<Record<string, string>>({});
    const [savingChatId, setSavingChatId] = useState<string | null>(null);
    const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});

    const supabase = createClient();

    // URL do webhook - usa a API Route do Next.js em produção
    // A URL base é detectada automaticamente pelo domínio atual ou pela variável de ambiente
    const getWebhookBaseUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return process.env.NEXT_PUBLIC_APP_URL || 'https://tracktelegram.vercel.app';
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
            // Check integration status for each bot
            for (const bot of data || []) {
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

                // Atualizar username no banco se necessário
                if (botData.result.username && botData.result.username !== bot.username) {
                    await supabase
                        .from("telegram_bots")
                        .update({ username: botData.result.username })
                        .eq("id", bot.id);
                    
                    // Atualizar localmente
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
                // Buscar dados atualizados do bot (pode ter chat_id salvo)
                const { data: freshBot } = await supabase
                    .from("telegram_bots")
                    .select("chat_id")
                    .eq("id", bot.id)
                    .single();
                
                const storedChatId = freshBot?.chat_id;
                let chatId: string | number | null = storedChatId || null;
                
                // Se temos chat_id armazenado, usar ele diretamente
                if (storedChatId) {
                    console.log("Usando chat_id armazenado:", storedChatId);
                    chatId = storedChatId;
                } else if (bot.channel_link) {
                    // Tentar extrair do link
                    const channelMatch = bot.channel_link.match(/t\.me\/([^\/\?]+)/);
                    
                    if (channelMatch) {
                        const channelIdentifier = channelMatch[1];
                        
                        // Se é link público (não começa com +)
                        if (!channelIdentifier.startsWith("+")) {
                            chatId = `@${channelIdentifier}`;
                        } else {
                            // Link privado - marcar como privado
                            status.channel.chatType = "private";
                        }
                    }
                }
                
                // Se temos um chatId válido, verificar status do bot
                if (chatId) {
                    try {
                        // Tentar obter informações do chat
                        const chatRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChat?chat_id=${chatId}`);
                        const chatData = await chatRes.json();
                        
                        if (chatData.ok) {
                            status.channel.isConnected = true;
                            status.channel.chatType = chatData.result.type;
                            status.channel.chatTitle = chatData.result.title || chatData.result.first_name;
                            
                            const finalChatId = chatData.result.id || chatId;
                            
                            // Se não tínhamos chat_id armazenado, salvar agora
                            if (!storedChatId && chatData.result.id) {
                                await supabase
                                    .from("telegram_bots")
                                    .update({ chat_id: chatData.result.id.toString() })
                                    .eq("id", bot.id);
                            }
                            
                            // Verificar se bot é admin usando getChatMember
                            try {
                                const memberRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChatMember?chat_id=${finalChatId}&user_id=${botUserId}`);
                                const memberData = await memberRes.json();
                                
                                if (memberData.ok) {
                                    const memberStatus = memberData.result.status;
                                    // Status pode ser: creator, administrator, member, restricted, left, kicked
                                    status.channel.botIsAdmin = memberStatus === "creator" || memberStatus === "administrator";
                                    status.channel.isConnected = memberStatus !== "left" && memberStatus !== "kicked";
                                }
                            } catch (e) {
                                console.log("Não foi possível verificar status do membro:", e);
                            }
                            
                            // Tentar obter lista de administradores (backup)
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
                                    console.log("Não foi possível obter lista de administradores:", e);
                                }
                            }
                            
                            // Tentar contar membros
                            try {
                                const countRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChatMemberCount?chat_id=${finalChatId}`);
                                const countData = await countRes.json();
                                if (countData.ok) {
                                    status.channel.memberCount = countData.result;
                                }
                            } catch (e) {
                                // Pode falhar se bot não tiver permissão
                            }
                        }
                    } catch (e) {
                        console.log("Erro ao verificar canal:", e);
                    }
                } else if (status.channel.chatType === "private") {
                    // Para canais privados sem chat_id salvo, verificar eventos recentes
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
                            
                            // Se encontrou eventos com chat_id, tentar verificar
                            if (metadata?.chat_id) {
                                // Atualizar chat_id no banco
                                await supabase
                                    .from("telegram_bots")
                                    .update({ chat_id: metadata.chat_id.toString() })
                                    .eq("id", bot.id);
                                
                                // Tentar verificar admin status
                                try {
                                    const memberRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChatMember?chat_id=${metadata.chat_id}&user_id=${botUserId}`);
                                    const memberData = await memberRes.json();
                                    
                                    if (memberData.ok) {
                                        const memberStatus = memberData.result.status;
                                        status.channel.botIsAdmin = memberStatus === "creator" || memberStatus === "administrator";
                                        status.channel.isConnected = memberStatus !== "left" && memberStatus !== "kicked";
                                    }
                                } catch (e) {
                                    console.log("Erro ao verificar admin status:", e);
                                }
                                
                                if (metadata.chat_title) {
                                    status.channel.chatTitle = metadata.chat_title;
                                }
                            }
                        }
                    } catch (e) {
                        console.log("Erro ao verificar eventos:", e);
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

        // Validar token do bot
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

        const { error } = await supabase.from("telegram_bots").insert({
            user_id: user.id,
            name: formData.name,
            bot_token: formData.bot_token,
            channel_link: formData.channel_link,
            username: username
        });

        if (error) {
            console.error(error);
            toast.error("Erro ao salvar bot: " + error.message);
        } else {
            toast.success("Canal configurado com sucesso!");
            setOpen(false);
            setFormData({ name: "", bot_token: "", channel_link: "", username: "" });
            fetchBots();
        }
        setSaving(false);
    }

    async function handleDelete(bot: TelegramBot) {
        if (!confirm(`Tem certeza que deseja remover "${bot.name}"? Esta ação não pode ser desfeita.`)) {
            return;
        }

        setDeleting(bot.id);

        // Primeiro, remover webhook se existir
        try {
            await fetch(`https://api.telegram.org/bot${bot.bot_token}/deleteWebhook`);
        } catch (e) {
            console.warn("Não foi possível remover webhook:", e);
        }

        // Verificar se há funis usando este bot
        const { data: funnels } = await supabase
            .from("funnels")
            .select("id")
            .eq("bot_id", bot.id);

        if (funnels && funnels.length > 0) {
            // Desvincular funis primeiro
            await supabase
                .from("funnels")
                .update({ bot_id: null })
                .eq("bot_id", bot.id);
        }

        // Remover vínculos de visitor_telegram_links
        await supabase
            .from("visitor_telegram_links")
            .delete()
            .eq("bot_id", bot.id);

        // Agora deletar o bot
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
            // Set webhook with allowed updates for tracking
            // my_chat_member: detecta quando bot é adicionado/removido do canal
            // chat_member: detecta quando membros entram/saem
            // chat_join_request: detecta solicitações de entrada em canais privados
            // message: detecta mensagens e comando /start
            // Monta a URL do webhook com o bot_id específico
            const webhookUrl = `${WEBHOOK_BASE_URL}/api/webhook/telegram/${bot.id}`;
            
            const params = new URLSearchParams({
                url: webhookUrl,
                allowed_updates: JSON.stringify([
                    "message",
                    "chat_member",
                    "chat_join_request",
                    "my_chat_member"
                ]),
                drop_pending_updates: "true"
            });

            const res = await fetch(`https://api.telegram.org/bot${bot.bot_token}/setWebhook?${params}`);
            const data = await res.json();

            if (data.ok) {
                toast.success("Rastreamento Ativado! Webhook configurado.");
                // Atualizar status
                await checkIntegrationStatus(bot);
            } else {
                toast.error(`Erro Telegram: ${data.description}`);
            }
        } catch (e) {
            toast.error("Erro de conexão com Telegram.");
        }
        setActivating(null);
    }

    async function deactivateWebhook(bot: TelegramBot) {
        setActivating(bot.id);

        try {
            const res = await fetch(`https://api.telegram.org/bot${bot.bot_token}/deleteWebhook`);
            const data = await res.json();

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

        // Validar formato do ID (deve ser um número, geralmente negativo para grupos/canais)
        if (!/^-?\d+$/.test(inputChatId)) {
            toast.error("ID inválido. O ID deve ser um número (ex: -1002406299839)");
            return;
        }

        setSavingChatId(bot.id);

        try {
            // Verificar se o ID é válido tentando obter informações do chat
            const chatRes = await fetch(`https://api.telegram.org/bot${bot.bot_token}/getChat?chat_id=${inputChatId}`);
            const chatData = await chatRes.json();

            if (!chatData.ok) {
                toast.error(`ID inválido: ${chatData.description || "Canal não encontrado"}`);
                setSavingChatId(null);
                return;
            }

            // Salvar no banco
            const { error } = await supabase
                .from("telegram_bots")
                .update({ chat_id: inputChatId })
                .eq("id", bot.id);

            if (error) {
                toast.error("Erro ao salvar ID do canal.");
            } else {
                toast.success(`Canal vinculado: ${chatData.result.title || inputChatId}`);
                
                // Atualizar estado local
                setBots(prev => prev.map(b => 
                    b.id === bot.id ? { ...b, chat_id: inputChatId } : b
                ));

                // Limpar input
                setChatIdInput(prev => ({ ...prev, [bot.id]: "" }));

                // Atualizar status
                await checkIntegrationStatus(bot);
            }
        } catch (e) {
            console.error("Erro ao salvar chat_id:", e);
            toast.error("Erro de conexão.");
        }

        setSavingChatId(null);
    }

    function copyBotLink(username: string) {
        const link = `https://t.me/${username}`;
        navigator.clipboard.writeText(link);
        setCopiedId(username);
        toast.success("Link copiado!");
        setTimeout(() => setCopiedId(null), 2000);
    }

    // Renderizar status item
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
            success: { bg: "bg-green-500/20", icon: "text-green-500", text: "text-green-400" },
            error: { bg: "bg-red-500/20", icon: "text-red-500", text: "text-red-400" },
            warning: { bg: "bg-yellow-500/20", icon: "text-yellow-500", text: "text-yellow-400" }
        };
        
        const color = status ? colors.success : colors[type];
        const Icon = status ? CheckCircle2 : type === "warning" ? AlertTriangle : XCircle;

        return (
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <div className={`h-8 w-8 rounded-full ${color.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${color.icon}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{title}</p>
                    <p className={`text-xs ${status ? "text-green-400" : color.text}`}>
                        {description}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Canal</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                            <Plus className="h-4 w-4" />
                            Adicionar Canal
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-card border-border">
                        <DialogHeader>
                            <DialogTitle>Configurar Novo Canal</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="bg-secondary/20 p-3 rounded text-xs text-muted-foreground mb-2">
                                <p className="font-bold text-foreground">Instruções:</p>
                                <ol className="list-decimal pl-4 space-y-1 mt-1">
                                    <li>Crie um Bot no <strong>@BotFather</strong>.</li>
                                    <li>Crie um Canal ou Grupo no Telegram.</li>
                                    <li><strong>Adicione o Bot como Administrador</strong> do seu Canal/Grupo.</li>
                                    <li>Cole o Token do Bot e o Link de Convite do Canal abaixo.</li>
                                </ol>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome do Canal</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Ofertas VIP"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="token">Token do Bot (BotFather)</Label>
                                <Input
                                    id="token"
                                    placeholder="123456:ABC-DEF..."
                                    value={formData.bot_token}
                                    onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="link">Link do Canal (Destino Final)</Label>
                                <Input
                                    id="link"
                                    placeholder="https://t.me/+AbCdEfGhIj..."
                                    value={formData.channel_link}
                                    onChange={(e) => setFormData({ ...formData, channel_link: e.target.value })}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Link de convite do seu canal/grupo. O usuário receberá este link após iniciar o bot.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar e Validar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table Header */}
            <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
                <div className="grid grid-cols-4 gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
                    <div>NOME DO CANAL</div>
                    <div>NOME DO BOT</div>
                    <div>TOKEN</div>
                    <div className="text-right">AÇÕES</div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                ) : bots.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                        Nenhum bot configurado.
                    </div>
                ) : (
                    bots.map(bot => {
                        const status = integrationStatuses[bot.id];
                        
                        return (
                            <div key={bot.id} className="grid grid-cols-4 gap-4 p-4 border-b border-border items-center">
                                <div className="font-medium">{bot.name}</div>
                                <div className="text-sm">
                                    {status?.bot?.username ? `@${status.bot.username}` : bot.username ? `@${bot.username}` : "—"}
                                </div>
                                <div className="font-mono text-xs text-muted-foreground">
                                    {bot.bot_token.substring(0, 15)}...
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <Dialog open={detailsOpen[bot.id] || false} onOpenChange={(open) => setDetailsOpen(prev => ({ ...prev, [bot.id]: open }))}>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Ver detalhes"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[700px] bg-card border-border max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    <Bot className="h-5 w-5 text-primary" />
                                                    Detalhes: {bot.name}
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-6 py-4">
                                                {/* Status da Integração */}
                                                {(() => {
                                                    const status = integrationStatuses[bot.id];
                                                    // Verifica se o webhook está configurado para a API route correta (com o bot_id)
                                                    const expectedWebhookPath = `/api/webhook/telegram/${bot.id}`;
                                                    const isWebhookCorrect = status?.webhook?.isSet && 
                                                        status?.webhook?.url?.includes(expectedWebhookPath);
                                                    
                                                    return (
                                                        <>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* Status do Bot */}
                                                                <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
                                                                    <h4 className="font-semibold text-center mb-4">Status do Bot</h4>
                                                                    
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
                                                                                    className="text-xs h-8"
                                                                                />
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="border-green-500/50 hover:bg-green-500/10 text-green-400 h-8 px-3"
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
                                                                            <p className="text-[10px] text-muted-foreground">
                                                                                Cole o ID do canal (ex: -1002406299839). 
                                                                                <a 
                                                                                    href="https://t.me/getidsbot" 
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-blue-400 hover:underline ml-1"
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
                                                                                className="w-full border-red-500/50 hover:bg-red-500/10 text-red-500"
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
                                                                                className="w-full bg-green-600 hover:bg-green-700"
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

                                                                {/* Status do Canal */}
                                                                <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
                                                                    <h4 className="font-semibold text-center mb-4">Status do Canal</h4>
                                                                    
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
                                                                        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                                                            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                                                <Info className="h-4 w-4 text-blue-500" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-medium">Membros no Canal</p>
                                                                                <p className="text-xs text-blue-400">{status.channel.memberCount} membros</p>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Link do canal */}
                                                                    {bot.channel_link && (
                                                                        <a 
                                                                            href={bot.channel_link} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center justify-center gap-2 p-2 bg-primary/10 hover:bg-primary/20 rounded text-primary text-sm transition-colors"
                                                                        >
                                                                            <ExternalLink className="h-4 w-4" />
                                                                            Abrir Canal no Telegram
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Botão de atualizar status */}
                                                            <div className="flex justify-center">
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => checkIntegrationStatus(bot)}
                                                                    disabled={checkingStatus === bot.id}
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
                                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
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
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg flex gap-3 text-yellow-400 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>
                    <span className="font-semibold">Importante:</span> Para garantir o correto funcionamento, o bot configurado para a TrackGram não deve ser utilizado simultaneamente em outras plataformas ou para outras finalidades. O uso indevido pode causar interferências e comprometer as funcionalidades da TrackGram
                </p>
            </div>
        </div>
    );
}
