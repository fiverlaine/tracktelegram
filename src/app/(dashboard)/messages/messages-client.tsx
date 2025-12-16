"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, MessageSquare, Send, Smartphone, Eye, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    getWelcomeSettings,
    saveWelcomeSettings,
    getMessageLogs,
    getChatList,
    getConversationMessages,
    sendReplyMessage,
    WelcomeSettings,
    ChatPreview
} from "@/app/actions/messages";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface MessagesClientProps {
    initialFunnels: any[];
}

export default function MessagesClient({ initialFunnels }: MessagesClientProps) {
    const [selectedFunnelId, setSelectedFunnelId] = useState<string>(initialFunnels[0]?.id || "");
    const [settings, setSettings] = useState<WelcomeSettings>({
        funnel_id: "",
        is_active: false,
        message_text: "Olá {first_name}! Seja bem-vindo ao nosso canal exclusivo.",
        buttons_config: [],
        image_url: ""
    });
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // CHAT STATE
    const [chatList, setChatList] = useState<ChatPreview[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

    // Carregar configurações e lista de chats quando mudar o funil
    useEffect(() => {
        if (!selectedFunnelId) return;

        async function load() {
            setLoading(true);
            const data = await getWelcomeSettings(selectedFunnelId);
            if (data) {
                setSettings(data);
            } else {
                setSettings({
                    funnel_id: selectedFunnelId,
                    is_active: false,
                    message_text: "Olá {first_name}! Seja bem-vindo ao nosso canal exclusivo.",
                    buttons_config: [],
                    image_url: ""
                });
            }

            // Carregar logs antigos (para aba Logs se ainda existir)
            const logsData = await getMessageLogs(selectedFunnelId);
            setLogs(logsData || []);

            // Carregar Lista de Chats
            const chats = await getChatList(selectedFunnelId);
            setChatList(chats);

            setLoading(false);
        }

        load();
    }, [selectedFunnelId]);


    // Carregar mensagens quando selecionar um chat
    useEffect(() => {
        if (!selectedFunnelId || !selectedChatId) return;

        const supabase = createClient();

        async function loadMessages() {
            const msgs = await getConversationMessages(selectedFunnelId, selectedChatId!);
            setChatMessages(msgs || []);
            
            // Scroll to bottom
            setTimeout(() => {
                const element = document.getElementById("scroll-anchor");
                element?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }

        // 1. Carga Inicial
        loadMessages();
        
        // 2. Realtime Subscription (Supabase)
        const channel = supabase
            .channel('chat-updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'telegram_message_logs',
                    filter: `funnel_id=eq.${selectedFunnelId}` // Otimização: filtrar pelo funil
                },
                (payload) => {
                    // Se a mensagem for deste chat, recarrega
                    if (payload.new.telegram_chat_id === selectedChatId) {
                        loadMessages();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [selectedFunnelId, selectedChatId]);

    const handleSelectChat = (chatId: string) => {
        setSelectedChatId(chatId);
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedChatId) return;
        setSendingReply(true);
        try {
            await sendReplyMessage(selectedFunnelId, selectedChatId, replyText);
            setReplyText("");
            
            // Recarregar mensagens imediatamente
            const msgs = await getConversationMessages(selectedFunnelId, selectedChatId);
            setChatMessages(msgs || []);
            
            // Atualizar lista de chats (para mostrar last message)
            const chats = await getChatList(selectedFunnelId);
            setChatList(chats);

            // Scroll to bottom
            setTimeout(() => {
                const element = document.getElementById("scroll-anchor");
                element?.scrollIntoView({ behavior: "smooth" });
            }, 100);

            toast.success("Mensagem enviada");
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao enviar mensagem", { description: error.message });
        } finally {
            setSendingReply(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveWelcomeSettings({ ...settings, funnel_id: selectedFunnelId });
            toast.success("Sucesso", {
                description: "Configurações de boas-vindas salvas com sucesso.",
            });
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao salvar", {
                description: error.message || "Não foi possível salvar as configurações.",
            });
        } finally {
            setSaving(false);
        }
    };

    const addButton = () => {
        setSettings({
            ...settings,
            buttons_config: [...settings.buttons_config, { label: "Novo Botão", url: "https://" }]
        });
    };

    const removeButton = (index: number) => {
        const newButtons = [...settings.buttons_config];
        newButtons.splice(index, 1);
        setSettings({ ...settings, buttons_config: newButtons });
    };

    const updateButton = (index: number, field: 'label' | 'url', value: string) => {
        const newButtons = [...settings.buttons_config];
        newButtons[index] = { ...newButtons[index], [field]: value };
        setSettings({ ...settings, buttons_config: newButtons });
    };

    return (

        <div className="space-y-6">
            {/* Seletor de Funil */}
            <div className="flex items-center justify-between bg-neutral-100 dark:bg-[#0a0a0a]/40 p-4 rounded-xl border border-neutral-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <MessageSquare className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Funil Selecionado</h3>
                        <p className="text-xs text-neutral-500 dark:text-gray-400">Gerencie mensagens e conversas</p>
                    </div>
                </div>
                <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
                    <SelectTrigger className="w-[250px] bg-white dark:bg-black/20 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white">
                        <SelectValue placeholder="Selecione um funil" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white">
                        {initialFunnels.map((funnel) => (
                            <SelectItem key={funnel.id} value={funnel.id}>
                                {funnel.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Tabs defaultValue="chat" className="w-full">
                <TabsList className="bg-neutral-100 dark:bg-black/20 border border-neutral-200 dark:border-white/5 p-1 w-full flex justify-start">
                    <TabsTrigger value="config" className="flex-1 max-w-[200px] data-[state=active]:bg-violet-600 data-[state=active]:text-white">Configuração</TabsTrigger>
                    <TabsTrigger value="chat" className="flex-1 max-w-[200px] data-[state=active]:bg-violet-600 data-[state=active]:text-white">Chat Ao Vivo</TabsTrigger>
                </TabsList>

                {/* ABA CONFIGURAÇÃO (Mantida Igual) */}
                <TabsContent value="config" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-white/60 dark:bg-[#0a0a0a]/40 border-neutral-200 dark:border-white/5 backdrop-blur-sm">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-neutral-900 dark:text-white">Boas-vindas</CardTitle>
                                            <CardDescription>Mensagem enviada assim que o usuário entra no canal.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-black/20 rounded-lg border border-neutral-200 dark:border-white/5">
                                            <div className="space-y-0.5">
                                                <Label className="text-neutral-900 dark:text-white text-base">Ativar Mensagens de Boas-vindas</Label>
                                                <p className="text-xs text-neutral-500 dark:text-gray-400">
                                                    Ao ativar, o link do funil passará a exigir <strong>aprovação para entrar</strong>.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={settings.is_active}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setShowConfirmDialog(true);
                                                    } else {
                                                        setSettings({
                                                            ...settings,
                                                            is_active: false,
                                                            use_join_request: false
                                                        });
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                                            <div className="text-amber-500 mt-0.5">⚠️</div>
                                            <div className="text-sm text-amber-600/80 dark:text-yellow-200/80">
                                                <p className="font-medium text-amber-600 dark:text-yellow-500 mb-1">Importante</p>
                                                Para garantir que o bot consiga enviar a mensagem privada, ao ativar este recurso, <strong>todos os links de convite deste funil passarão a ser do tipo "Pedir para Entrar"</strong>. O bot aprovará a entrada automaticamente e enviará a mensagem em seguida.
                                            </div>
                                        </div>

                                        <div className={`space-y-6 transition-opacity duration-300 ${!settings.is_active ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                            <div className="space-y-2">
                                                <Label className="text-neutral-700 dark:text-gray-300">Mensagem de Texto</Label>
                                                <Textarea
                                                    value={settings.message_text}
                                                    onChange={(e) => setSettings({ ...settings, message_text: e.target.value })}
                                                    className="bg-white dark:bg-black/20 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white min-h-[150px]"
                                                    placeholder="Digite sua mensagem aqui..."
                                                    disabled={!settings.is_active}
                                                />
                                                <p className="text-xs text-neutral-500 dark:text-gray-500">
                                                    Variáveis disponíveis: <span className="text-violet-600 dark:text-violet-400">{`{first_name}`}</span>, <span className="text-violet-600 dark:text-violet-400">{`{username}`}</span>
                                                </p>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-neutral-700 dark:text-gray-300">Botões (Inline Keyboard)</Label>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={addButton}
                                                        className="border-dashed border-neutral-300 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-600 dark:text-gray-300"
                                                        disabled={!settings.is_active}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" /> Adicionar Botão
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {settings.buttons_config.map((btn, index) => (
                                                        <div key={index} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2">
                                                            <div className="flex-1 space-y-2">
                                                                <Input
                                                                    placeholder="Texto do Botão"
                                                                    value={btn.label}
                                                                    onChange={(e) => updateButton(index, 'label', e.target.value)}
                                                                    className="bg-white dark:bg-black/20 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white h-9"
                                                                    disabled={!settings.is_active}
                                                                />
                                                            </div>
                                                            <div className="flex-[2] space-y-2">
                                                                <Input
                                                                    placeholder="URL (https://...)"
                                                                    value={btn.url}
                                                                    onChange={(e) => updateButton(index, 'url', e.target.value)}
                                                                    className="bg-white dark:bg-black/20 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white h-9"
                                                                    disabled={!settings.is_active}
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeButton(index)}
                                                                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10 h-9 w-9"
                                                                disabled={!settings.is_active}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {settings.buttons_config.length === 0 && (
                                                        <div className="text-center py-8 border border-dashed border-neutral-200 dark:border-white/10 rounded-lg text-neutral-500 dark:text-gray-500 text-sm">
                                                            Nenhum botão configurado
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-white/5">
                                        <Button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Salvando...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Salvar Alterações
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="sticky top-6">
                                <div className="bg-white dark:bg-black border-[8px] border-neutral-800 dark:border-gray-800 rounded-[3rem] overflow-hidden shadow-2xl max-w-[320px] mx-auto relative h-[600px]">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 dark:bg-gray-800 rounded-b-xl z-20"></div>
                                    <div className="bg-[#f2f2f2] dark:bg-[#0e1621] h-full w-full flex flex-col pt-10 pb-4 overflow-hidden relative">
                                        <div className="bg-white dark:bg-[#17212b] px-4 py-2 flex items-center gap-3 shadow-sm z-10">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">BOT</div>
                                            <div>
                                                <div className="text-neutral-900 dark:text-white text-sm font-bold">Seu Bot</div>
                                                <div className="text-neutral-500 dark:text-[#6c7883] text-xs">bot</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#e5e5e5] dark:bg-[url('https://w.wallhaven.cc/full/vg/wallhaven-vg8885.jpg')] bg-cover">
                                            <div className="flex justify-center my-2">
                                                <span className="bg-black/20 dark:bg-[#17212b]/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">Hoje</span>
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <div className="bg-white dark:bg-[#182533] rounded-tl-xl rounded-tr-xl rounded-br-xl p-3 max-w-[85%] shadow-sm border border-black/5 dark:border-black/10">
                                                    <p className="text-neutral-900 dark:text-white text-sm whitespace-pre-wrap">
                                                        {settings.message_text.replace("{first_name}", "Ryan").replace("{username}", "@ryan")}
                                                    </p>
                                                    {settings.buttons_config.length > 0 && (
                                                        <div className="mt-3 space-y-1">
                                                            {settings.buttons_config.map((btn, i) => (
                                                                <div key={i} className="bg-blue-500/10 dark:bg-[#2b5278] hover:bg-blue-500/20 dark:hover:bg-[#2b5278]/80 text-blue-600 dark:text-white text-xs font-medium py-2 px-3 rounded text-center cursor-pointer transition-colors">
                                                                    {btn.label || "Botão"}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex justify-end mt-1">
                                                        <span className="text-neutral-400 dark:text-[#6c7883] text-[10px]">12:30 PM</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-center text-xs text-neutral-500 dark:text-gray-500 mt-4">Pré-visualização aproximada</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* ABA CHAT (NOVA) */}
                <TabsContent value="chat" className="mt-6">
                    <div className="flex bg-white/60 dark:bg-[#0a0a0a]/40 border border-neutral-200 dark:border-white/5 rounded-xl overflow-hidden h-[600px] backdrop-blur-md">
                        {/* 1. Sidebar de Conversas */}
                        <div className="w-[320px] bg-white/60 dark:bg-[#0a0a0a]/60 border-r border-neutral-200 dark:border-white/5 flex flex-col">
                            <div className="p-4 border-b border-neutral-200 dark:border-white/5">
                                <h3 className="text-neutral-900 dark:text-white font-medium mb-4">Conversas</h3>
                                <div className="space-y-2">
                                    <Input 
                                        placeholder="Buscar conversa..." 
                                        className="bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white h-9 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {chatList.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-gray-500 p-4 text-center">
                                        <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-xs">Nenhuma conversa encontrada neste funil.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-0.5">
                                        {chatList.map((chat) => (
                                            <button
                                                key={chat.telegram_chat_id}
                                                onClick={() => handleSelectChat(chat.telegram_chat_id)}
                                                className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left border-l-2 ${selectedChatId === chat.telegram_chat_id ? 'bg-neutral-50 dark:bg-white/5 border-violet-500' : 'border-transparent'}`}
                                            >
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                    {chat.telegram_user_name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className={`text-sm font-medium truncate ${selectedChatId === chat.telegram_chat_id ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-gray-300'}`}>
                                                            {chat.telegram_user_name}
                                                        </span>
                                                        <span className="text-[10px] text-neutral-400 dark:text-gray-500">
                                                            {new Date(chat.last_message_at).toLocaleTimeString().slice(0, 5)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-neutral-500 dark:text-gray-500 truncate">
                                                        {chat.last_message}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Área Principal do Chat */}
                        <div className="flex-1 flex flex-col bg-neutral-100/50 dark:bg-[#111111]/80">
                            {selectedChatId ? (
                                <>
                                    {/* Header do Chat */}
                                    <div className="h-16 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between px-6 bg-white/60 dark:bg-[#0a0a0a]/40">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                                {chatList.find(c => c.telegram_chat_id === selectedChatId)?.telegram_user_name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-neutral-900 dark:text-white text-sm font-medium">
                                                    {chatList.find(c => c.telegram_chat_id === selectedChatId)?.telegram_user_name}
                                                </h4>
                                                <p className="text-xs text-neutral-500 dark:text-gray-500 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Online via Telegram
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lista de Mensagens */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-[url('https://w.wallhaven.cc/full/vg/wallhaven-vg8885.jpg')] dark:bg-cover dark:bg-center dark:bg-blend-overlay dark:bg-black/80">
                                        {chatMessages.length === 0 ? (
                                            <div className="flex items-center justify-center h-full">
                                                <Loader2 className="h-6 w-6 text-violet-500 animate-spin" />
                                            </div>
                                        ) : (
                                            chatMessages.map((msg) => {
                                                const isOutbound = msg.direction === 'outbound';
                                                return (
                                                    <div 
                                                        key={msg.id} 
                                                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div 
                                                            className={`
                                                                max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm relative group
                                                                ${isOutbound 
                                                                    ? 'bg-violet-600 text-white rounded-tr-none' 
                                                                    : 'bg-white dark:bg-[#202c33] text-neutral-900 dark:text-gray-100 rounded-tl-none border border-neutral-200 dark:border-white/5'
                                                                }
                                                            `}
                                                        >
                                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.message_content}</p>
                                                            <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isOutbound ? 'text-violet-200' : 'text-neutral-400 dark:text-gray-400'}`}>
                                                                {new Date(msg.created_at).toLocaleTimeString().slice(0, 5)}
                                                                {isOutbound && <CheckCircle2 className="h-3 w-3" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div id="scroll-anchor"></div>
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 bg-white dark:bg-[#0a0a0a] border-t border-neutral-200 dark:border-white/5">
                                        <div className="flex gap-2">
                                            <Input 
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendReply();
                                                    }
                                                }}
                                                placeholder="Digite sua mensagem..." 
                                                className="bg-neutral-100 dark:bg-[#202c33] border-none text-neutral-900 dark:text-white focus-visible:ring-violet-500/50"
                                            />
                                            <Button 
                                                onClick={handleSendReply}
                                                disabled={!replyText.trim() || sendingReply}
                                                className="bg-violet-600 hover:bg-violet-700 text-white w-12 px-0"
                                            >
                                                {sendingReply ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                            </Button>
                                        </div>
                                        <div className="text-[10px] text-neutral-500 dark:text-gray-500 mt-2 text-center">
                                            Pressione Enter para enviar
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-gray-500 p-8 text-center bg-neutral-100/50 dark:bg-[#0a0a0a]/20">
                                    <div className="w-20 h-20 rounded-full bg-neutral-200 dark:bg-white/5 flex items-center justify-center mb-4">
                                        <MessageSquare className="h-10 w-10 opacity-30" />
                                    </div>
                                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">TrackGram Chat</h3>
                                    <p className="text-sm max-w-sm">Selecione uma conversa ao lado para visualizar o histórico e responder mensagens do Telegram.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modal de Confirmação */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="bg-white dark:bg-[#1a1a1a] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Ativar Mensagens de Boas-vindas?</DialogTitle>
                        <DialogDescription className="text-neutral-500 dark:text-gray-400">
                            Ao ativar este recurso, todos os links de convite gerados para este funil passarão a exigir <strong>aprovação para entrar</strong> ("Pedir para Entrar").
                            <br /><br />
                            O bot aprovará automaticamente a entrada do usuário e enviará a mensagem de boas-vindas logo em seguida.
                            <br /><br />
                            Deseja confirmar essa alteração?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowConfirmDialog(false);
                                setSettings({...settings, is_active: false});
                            }}
                            className="border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-white/5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                setShowConfirmDialog(false);
                                setSettings({...settings, is_active: true, use_join_request: true});
                            }}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
