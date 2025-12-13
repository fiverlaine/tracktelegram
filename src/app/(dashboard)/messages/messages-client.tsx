"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, MessageSquare, Send, Smartphone, Eye, CheckCircle2, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getWelcomeSettings, saveWelcomeSettings, getMessageLogs, WelcomeSettings } from "@/app/actions/messages";
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

    // Carregar configurações quando mudar o funil
    useEffect(() => {
        if (!selectedFunnelId) return;

        async function load() {
            setLoading(true);
            const data = await getWelcomeSettings(selectedFunnelId);
            if (data) {
                setSettings(data);
            } else {
                // Resetar para padrão se não existir
                setSettings({
                    funnel_id: selectedFunnelId,
                    is_active: false,
                    message_text: "Olá {first_name}! Seja bem-vindo ao nosso canal exclusivo.",
                    buttons_config: [],
                    image_url: ""
                });
            }

            // Carregar logs
            const logsData = await getMessageLogs(selectedFunnelId);
            setLogs(logsData || []);

            setLoading(false);
        }

        load();
    }, [selectedFunnelId]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveWelcomeSettings({ ...settings, funnel_id: selectedFunnelId });
            toast.success("Sucesso", {
                description: "Configurações de boas-vindas salvas com sucesso.",
            });
        } catch (error) {
            toast.error("Erro", {
                description: "Não foi possível salvar as configurações.",
            });
        } finally {
            setLoading(false);
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
            <div className="flex items-center justify-between bg-[#0a0a0a]/40 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <MessageSquare className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">Funil Selecionado</h3>
                        <p className="text-xs text-gray-400">Configure as mensagens para este funil</p>
                    </div>
                </div>
                <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
                    <SelectTrigger className="w-[250px] bg-black/20 border-white/10 text-white">
                        <SelectValue placeholder="Selecione um funil" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                        {initialFunnels.map((funnel) => (
                            <SelectItem key={funnel.id} value={funnel.id}>
                                {funnel.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Tabs defaultValue="config" className="w-full">
                <TabsList className="bg-black/20 border border-white/5 p-1">
                    <TabsTrigger value="config" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Configuração</TabsTrigger>
                    <TabsTrigger value="logs" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Histórico de Envios</TabsTrigger>
                </TabsList>

                {/* ABA CONFIGURAÇÃO */}
                <TabsContent value="config" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Coluna Esquerda: Editor */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-[#0a0a0a]/40 border-white/5 backdrop-blur-sm">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-white">Boas-vindas</CardTitle>
                                            <CardDescription>Mensagem enviada assim que o usuário entra no canal.</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="active-mode" className="text-sm text-gray-400">
                                                {settings.is_active ? "Ativado" : "Desativado"}
                                            </Label>
                                            <Switch
                                                id="active-mode"
                                                checked={settings.is_active}
                                                onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Mensagem de Texto</Label>
                                        <Textarea
                                            value={settings.message_text}
                                            onChange={(e) => setSettings({ ...settings, message_text: e.target.value })}
                                            className="bg-black/20 border-white/10 text-white min-h-[150px]"
                                            placeholder="Digite sua mensagem aqui..."
                                        />
                                        <p className="text-xs text-gray-500">
                                            Variáveis disponíveis: <span className="text-violet-400">{`{first_name}`}</span>, <span className="text-violet-400">{`{username}`}</span>
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-gray-300">Botões (Inline Keyboard)</Label>
                                            <Button variant="outline" size="sm" onClick={addButton} className="border-dashed border-white/20 hover:bg-white/5 text-gray-300">
                                                <Plus className="h-4 w-4 mr-2" /> Adicionar Botão
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {settings.buttons_config.map((btn, idx) => (
                                                <div key={idx} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2">
                                                    <div className="grid grid-cols-2 gap-3 flex-1">
                                                        <Input
                                                            value={btn.label}
                                                            onChange={(e) => updateButton(idx, 'label', e.target.value)}
                                                            placeholder="Texto do Botão"
                                                            className="bg-black/20 border-white/10 text-white"
                                                        />
                                                        <Input
                                                            value={btn.url}
                                                            onChange={(e) => updateButton(idx, 'url', e.target.value)}
                                                            placeholder="https://..."
                                                            className="bg-black/20 border-white/10 text-white"
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeButton(idx)}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {settings.buttons_config.length === 0 && (
                                                <div className="text-center py-8 border border-dashed border-white/10 rounded-lg text-gray-500 text-sm">
                                                    Nenhum botão configurado.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex justify-end">
                                        <Button
                                            onClick={handleSave}
                                            disabled={loading}
                                            className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
                                        >
                                            {loading ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                                                    Salvando...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Save className="h-4 w-4" />
                                                    Salvar Alterações
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Coluna Direita: Preview */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-6">
                                <div className="bg-black border-[8px] border-gray-800 rounded-[3rem] overflow-hidden shadow-2xl max-w-[320px] mx-auto relative h-[600px]">
                                    {/* Notch */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-20"></div>

                                    {/* Screen Content */}
                                    <div className="bg-[#0e1621] h-full w-full flex flex-col pt-10 pb-4 overflow-hidden relative">
                                        {/* Header Telegram */}
                                        <div className="bg-[#17212b] px-4 py-2 flex items-center gap-3 shadow-sm z-10">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                                BOT
                                            </div>
                                            <div>
                                                <div className="text-white text-sm font-bold">Seu Bot</div>
                                                <div className="text-[#6c7883] text-xs">bot</div>
                                            </div>
                                        </div>

                                        {/* Chat Area */}
                                        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[url('https://w.wallhaven.cc/full/vg/wallhaven-vg8885.jpg')] bg-cover">
                                            <div className="flex justify-center my-2">
                                                <span className="bg-[#17212b]/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">Hoje</span>
                                            </div>

                                            {/* Message Bubble */}
                                            <div className="flex items-end gap-2">
                                                <div className="bg-[#182533] rounded-tl-xl rounded-tr-xl rounded-br-xl p-3 max-w-[85%] shadow-sm border border-black/10">
                                                    <p className="text-white text-sm whitespace-pre-wrap">
                                                        {settings.message_text.replace("{first_name}", "Ryan").replace("{username}", "@ryan")}
                                                    </p>

                                                    {/* Buttons Preview */}
                                                    {settings.buttons_config.length > 0 && (
                                                        <div className="mt-3 space-y-1">
                                                            {settings.buttons_config.map((btn, i) => (
                                                                <div key={i} className="bg-[#2b5278] hover:bg-[#2b5278]/80 text-white text-xs font-medium py-2 px-3 rounded text-center cursor-pointer transition-colors">
                                                                    {btn.label || "Botão"}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="flex justify-end mt-1">
                                                        <span className="text-[#6c7883] text-[10px]">12:30 PM</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Input Area (Fake) */}
                                        <div className="bg-[#17212b] px-3 py-2 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full border border-[#6c7883]"></div>
                                            <div className="flex-1 h-8 bg-[#0e1621] rounded px-2"></div>
                                            <div className="w-6 h-6 rounded-full bg-[#2b5278]"></div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-center text-xs text-gray-500 mt-4">Pré-visualização aproximada</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* ABA LOGS */}
                <TabsContent value="logs" className="mt-6">
                    <Card className="bg-[#0a0a0a]/40 border-white/5 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-white">Histórico de Mensagens</CardTitle>
                            <CardDescription>Últimas interações do bot neste funil.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-white/5 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white/5 text-gray-400 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Data</th>
                                            <th className="px-4 py-3">Usuário</th>
                                            <th className="px-4 py-3">Direção</th>
                                            <th className="px-4 py-3">Conteúdo</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                    Nenhum registro encontrado.
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-white/[0.02]">
                                                    <td className="px-4 py-3 text-gray-400">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-white font-medium">
                                                        {log.telegram_user_name || log.telegram_chat_id}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {log.direction === 'outbound' ? (
                                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                <Send className="h-3 w-3" /> Enviada
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                                                <MessageSquare className="h-3 w-3" /> Recebida
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-300 max-w-[300px] truncate">
                                                        {log.message_content}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Enviado
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
