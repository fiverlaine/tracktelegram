"use client";

import { useEffect, useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
    Bell, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    ExternalLink, 
    Trash2, 
    TestTube,
    Eye,
    EyeOff,
    Info,
    Sparkles,
    UserPlus,
    UserMinus,
    MousePointer,
    ArrowRightLeft,
    Save
} from "lucide-react";
import { toast } from "sonner";
import { 
    getPushcutIntegration, 
    savePushcutIntegration, 
    updatePushcutNotification,
    deletePushcutIntegration,
    testPushcutNotificationAction,
    type PushcutIntegration,
    type PushcutNotification
} from "@/app/actions/pushcut";
import { EVENT_LABELS, TEMPLATE_VARIABLES, DEFAULT_TEMPLATES, type PushcutEventType } from "@/lib/pushcut";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

// Ícones para cada tipo de evento
const EVENT_ICONS: Record<PushcutEventType, any> = {
    new_lead: UserPlus,
    member_join: UserPlus,
    member_leave: UserMinus,
    pageview: Eye,
    click: MousePointer,
    join_request: ArrowRightLeft
};

// Cores para cada tipo de evento
const EVENT_COLORS: Record<PushcutEventType, string> = {
    new_lead: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    member_join: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    member_leave: "text-red-500 bg-red-500/10 border-red-500/20",
    pageview: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    click: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    join_request: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
};

export default function PushcutPage() {
    const [loading, setLoading] = useState(true);
    const [integration, setIntegration] = useState<PushcutIntegration | null>(null);
    const [notifications, setNotifications] = useState<PushcutNotification[]>([]);
    
    // Form state
    const [apiKey, setApiKey] = useState("");
    const [notificationName, setNotificationName] = useState("TrackGram");
    const [showApiKey, setShowApiKey] = useState(false);
    
    // Transitions
    const [isPending, startTransition] = useTransition();
    const [testingEvent, setTestingEvent] = useState<PushcutEventType | null>(null);
    const [savingNotification, setSavingNotification] = useState<string | null>(null);
    
    // Dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    
    useEffect(() => {
        loadData();
    }, []);
    
    async function loadData() {
        setLoading(true);
        const result = await getPushcutIntegration();
        
        if (result.integration) {
            setIntegration(result.integration);
            setApiKey(result.integration.api_key);
            setNotificationName(result.integration.notification_name);
            setNotifications(result.notifications);
        }
        
        setLoading(false);
    }
    
    async function handleSaveIntegration() {
        if (!apiKey.trim()) {
            toast.error("Por favor, insira sua API Key do Pushcut.");
            return;
        }
        
        startTransition(async () => {
            const result = await savePushcutIntegration({
                api_key: apiKey.trim(),
                notification_name: notificationName.trim() || "TrackGram",
                is_active: true
            });
            
            if (result.success) {
                toast.success("Integração salva com sucesso!");
                loadData();
            } else {
                toast.error(result.error || "Erro ao salvar integração.");
            }
        });
    }
    
    async function handleToggleNotification(notification: PushcutNotification) {
        setSavingNotification(notification.id);
        
        const result = await updatePushcutNotification({
            id: notification.id,
            enabled: !notification.enabled
        });
        
        if (result.success) {
            setNotifications(prev => 
                prev.map(n => n.id === notification.id ? { ...n, enabled: !n.enabled } : n)
            );
            toast.success(`Notificação ${!notification.enabled ? 'ativada' : 'desativada'}!`);
        } else {
            toast.error(result.error || "Erro ao atualizar notificação.");
        }
        
        setSavingNotification(null);
    }
    
    async function handleSaveTemplate(notification: PushcutNotification, title: string, text: string) {
        setSavingNotification(notification.id);
        
        const result = await updatePushcutNotification({
            id: notification.id,
            title_template: title,
            text_template: text
        });
        
        if (result.success) {
            setNotifications(prev => 
                prev.map(n => n.id === notification.id ? { ...n, title_template: title, text_template: text } : n)
            );
            toast.success("Template atualizado!");
        } else {
            toast.error(result.error || "Erro ao salvar template.");
        }
        
        setSavingNotification(null);
    }
    
    async function handleTestNotification(eventType: PushcutEventType) {
        setTestingEvent(eventType);
        
        const result = await testPushcutNotificationAction(eventType);
        
        if (result.success) {
            toast.success("Notificação de teste enviada! Verifique seu dispositivo.");
        } else {
            toast.error(result.error || "Erro ao enviar notificação de teste.");
        }
        
        setTestingEvent(null);
    }
    
    async function handleDeleteIntegration() {
        startTransition(async () => {
            const result = await deletePushcutIntegration();
            
            if (result.success) {
                toast.success("Integração removida com sucesso!");
                setIntegration(null);
                setNotifications([]);
                setApiKey("");
                setNotificationName("TrackGram");
                setDeleteDialogOpen(false);
            } else {
                toast.error(result.error || "Erro ao remover integração.");
            }
        });
    }
    
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }
    
    return (
        <TooltipProvider>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PageHeader 
                    title="Pushcut" 
                    description="Receba notificações push em tempo real sobre eventos do seu TrackGram."
                />
                
                {/* Hero Section */}
                <Card className="bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-transparent border-orange-500/20 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <CardContent className="p-6 relative">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-orange-500/20 border border-orange-500/30">
                                <Bell className="h-8 w-8 text-orange-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                                    Notificações Push com Pushcut
                                </h3>
                                <p className="text-sm text-neutral-600 dark:text-gray-400 mb-4">
                                    Receba alertas instantâneos no seu iPhone sempre que novos leads entrarem, 
                                    membros interagirem com seu canal, ou qualquer outro evento importante acontecer.
                                </p>
                                <a 
                                    href="https://www.pushcut.io" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-orange-500 hover:text-orange-400 transition-colors"
                                >
                                    Saiba mais sobre o Pushcut
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Configuration Card */}
                <Card className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border-neutral-200 dark:border-white/5">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    Configuração
                                    {integration && (
                                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Conectado
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    Configure sua API Key do Pushcut para começar a receber notificações.
                                </CardDescription>
                            </div>
                            {integration && (
                                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remover
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Remover Integração</DialogTitle>
                                            <DialogDescription>
                                                Tem certeza que deseja remover a integração com Pushcut? 
                                                Você deixará de receber notificações push.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
                                                Cancelar
                                            </Button>
                                            <Button 
                                                variant="destructive" 
                                                onClick={handleDeleteIntegration}
                                                disabled={isPending}
                                            >
                                                {isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                )}
                                                Remover
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* API Key */}
                            <div className="space-y-2">
                                <Label htmlFor="api-key" className="flex items-center gap-2">
                                    API Key
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="h-3 w-3 text-neutral-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Encontre sua API Key nas configurações do app Pushcut</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="api-key"
                                        type={showApiKey ? "text" : "password"}
                                        placeholder="Sua API Key do Pushcut"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                    >
                                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Notification Name */}
                            <div className="space-y-2">
                                <Label htmlFor="notification-name" className="flex items-center gap-2">
                                    Nome da Notificação
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="h-3 w-3 text-neutral-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Nome da notificação configurada no Pushcut (deve existir no app)</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </Label>
                                <Input
                                    id="notification-name"
                                    placeholder="TrackGram"
                                    value={notificationName}
                                    onChange={(e) => setNotificationName(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <Button 
                                onClick={handleSaveIntegration}
                                disabled={isPending || !apiKey.trim()}
                                className="bg-violet-600 hover:bg-violet-700"
                            >
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                {integration ? "Atualizar" : "Conectar"}
                            </Button>
                            
                            <p className="text-xs text-neutral-500">
                                Ao conectar, testaremos automaticamente sua API Key.
                            </p>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Notifications Configuration */}
                {integration && notifications.length > 0 && (
                    <Card className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border-neutral-200 dark:border-white/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-violet-500" />
                                Eventos e Notificações
                            </CardTitle>
                            <CardDescription>
                                Configure quais eventos devem disparar notificações e personalize as mensagens.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="space-y-3">
                                {notifications.map((notification) => {
                                    const eventType = notification.event_type as PushcutEventType;
                                    const Icon = EVENT_ICONS[eventType];
                                    const colorClass = EVENT_COLORS[eventType];
                                    const variables = TEMPLATE_VARIABLES[eventType];
                                    
                                    return (
                                        <AccordionItem
                                            key={notification.id}
                                            value={notification.id}
                                            className="border border-neutral-200 dark:border-white/10 rounded-xl overflow-hidden"
                                        >
                                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-neutral-50 dark:hover:bg-white/5">
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className={`p-2 rounded-lg border ${colorClass}`}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <span className="font-medium text-neutral-900 dark:text-white">
                                                            {EVENT_LABELS[eventType]}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                                        <Badge 
                                                            variant="outline" 
                                                            className={notification.enabled 
                                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                                                : "bg-neutral-500/10 text-neutral-500 border-neutral-500/20"
                                                            }
                                                        >
                                                            {notification.enabled ? "Ativo" : "Inativo"}
                                                        </Badge>
                                                        <Switch
                                                            checked={notification.enabled}
                                                            onCheckedChange={() => handleToggleNotification(notification)}
                                                            disabled={savingNotification === notification.id}
                                                        />
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-4 pb-4">
                                                <NotificationEditor
                                                    notification={notification}
                                                    variables={variables}
                                                    onSave={(title, text) => handleSaveTemplate(notification, title, text)}
                                                    onTest={() => handleTestNotification(eventType)}
                                                    isSaving={savingNotification === notification.id}
                                                    isTesting={testingEvent === eventType}
                                                />
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        </CardContent>
                    </Card>
                )}
                
                {/* Help Card */}
                <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="p-6">
                        <h4 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Como configurar o Pushcut
                        </h4>
                        <ol className="list-decimal pl-4 space-y-2 text-sm text-neutral-600 dark:text-gray-400">
                            <li>
                                Baixe o app <a href="https://apps.apple.com/app/pushcut/id1450936447" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Pushcut na App Store</a> (requer iOS).
                            </li>
                            <li>
                                Crie uma conta e acesse as configurações do app.
                            </li>
                            <li>
                                Copie sua <strong>API Key</strong> e cole acima.
                            </li>
                            <li>
                                Crie uma notificação no app com o nome <strong>"TrackGram"</strong> (ou o nome que preferir).
                            </li>
                            <li>
                                Ative os eventos que deseja receber notificações.
                            </li>
                            <li>
                                Use o botão de teste para verificar se está funcionando!
                            </li>
                        </ol>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}

// ============================================
// Sub-component: Notification Editor
// ============================================

interface NotificationEditorProps {
    notification: PushcutNotification;
    variables: string[];
    onSave: (title: string, text: string) => void;
    onTest: () => void;
    isSaving: boolean;
    isTesting: boolean;
}

function NotificationEditor({ notification, variables, onSave, onTest, isSaving, isTesting }: NotificationEditorProps) {
    const [title, setTitle] = useState(notification.title_template);
    const [text, setText] = useState(notification.text_template);
    const hasChanges = title !== notification.title_template || text !== notification.text_template;
    
    return (
        <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/10">
            {/* Variables Helper */}
            <div className="flex flex-wrap gap-2">
                <span className="text-xs text-neutral-500">Variáveis disponíveis:</span>
                {variables.map((variable) => (
                    <Badge
                        key={variable}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-violet-500/10 hover:border-violet-500/30 transition-colors"
                        onClick={() => {
                            // Insert variable at cursor position (simplified: append to text)
                            setText(prev => prev + " " + variable);
                        }}
                    >
                        {variable}
                    </Badge>
                ))}
            </div>
            
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor={`title-${notification.id}`} className="text-xs text-neutral-500">
                    Título da Notificação
                </Label>
                <Input
                    id={`title-${notification.id}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título da notificação"
                    className="text-sm"
                />
            </div>
            
            {/* Text */}
            <div className="space-y-2">
                <Label htmlFor={`text-${notification.id}`} className="text-xs text-neutral-500">
                    Mensagem
                </Label>
                <Textarea
                    id={`text-${notification.id}`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Mensagem da notificação"
                    className="text-sm min-h-[80px] resize-none"
                />
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
                <Button
                    size="sm"
                    onClick={() => onSave(title, text)}
                    disabled={isSaving || !hasChanges}
                    className="bg-violet-600 hover:bg-violet-700"
                >
                    {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    ) : (
                        <Save className="h-3 w-3 mr-2" />
                    )}
                    Salvar
                </Button>
                
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onTest}
                    disabled={isTesting || !notification.enabled}
                >
                    {isTesting ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    ) : (
                        <TestTube className="h-3 w-3 mr-2" />
                    )}
                    Testar
                </Button>
                
                {!notification.enabled && (
                    <span className="text-xs text-neutral-500">
                        Ative a notificação para testar
                    </span>
                )}
            </div>
        </div>
    );
}
