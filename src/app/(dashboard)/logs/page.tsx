"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Activity, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-header";

interface CAPILog {
    id: string;
    visitor_id: string;
    funnel_id: string;
    event_name: string;
    pixel_id: string;
    status: "success" | "error" | "skipped";
    request_payload: any;
    response_payload: any;
    error_message: string | null;
    created_at: string;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<CAPILog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    const supabase = createClient();

    async function fetchLogs() {
        const { data, error } = await supabase
            .from("capi_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            console.error("Erro ao buscar logs:", error);
        } else {
            setLogs(data || []);
        }
    }

    useEffect(() => {
        fetchLogs().finally(() => setLoading(false));
    }, []);

    async function handleRefresh() {
        setRefreshing(true);
        await fetchLogs();
        setRefreshing(false);
    }

    function getStatusIcon(status: string) {
        switch (status) {
            case "success":
                return <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />;
            case "error":
                return <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
            case "skipped":
                return <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />;
            default:
                return <Clock className="h-5 w-5 text-neutral-400 dark:text-gray-400" />;
        }
    }

    function getStatusBadge(status: string) {
        const colors = {
            success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            error: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
            skipped: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        };
        return colors[status as keyof typeof colors] || "bg-neutral-500/10 text-neutral-500 dark:text-gray-400 border-neutral-500/20";
    }

    // Estatísticas
    const stats = {
        total: logs.length,
        success: logs.filter(l => l.status === "success").length,
        error: logs.filter(l => l.status === "error").length,
        skipped: logs.filter(l => l.status === "skipped").length
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <PageHeader title="Logs CAPI" description="Monitor de envios para Facebook Conversions API">
                <Button 
                    variant="outline" 
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    className="gap-2 bg-transparent border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Atualizar
                </Button>
            </PageHeader>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-3 text-neutral-500 dark:text-gray-400 mb-2">
                         <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 dark:text-blue-400">
                             <Activity className="h-4 w-4" />
                         </div>
                        <span className="text-sm font-medium">Total de Eventos</span>
                    </div>
                    <div className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-emerald-500/10 dark:border-emerald-500/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 text-emerald-600/80 dark:text-emerald-400/80 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Sucesso</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.success}</div>
                </div>
                <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-red-500/10 dark:border-red-500/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 text-red-600/80 dark:text-red-400/80 mb-2">
                         <div className="p-2 bg-red-500/10 rounded-lg text-red-600 dark:text-red-400">
                            <XCircle className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Erros</span>
                    </div>
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.error}</div>
                </div>
                <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-amber-500/10 dark:border-amber-500/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 text-amber-600/80 dark:text-amber-400/80 mb-2">
                         <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Ignorados</span>
                    </div>
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.skipped}</div>
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">Histórico de Envios</h2>
                    <p className="text-neutral-500 dark:text-gray-400 text-sm">Últimos 50 eventos processados pelo sistema.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-violet-500 h-8 w-8" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center p-12 text-neutral-500 dark:text-gray-500 border border-dashed border-neutral-200 dark:border-white/5 rounded-xl">
                        Nenhum log encontrado. Os logs aparecerão aqui quando eventos forem enviados para o Facebook.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <div 
                                key={log.id} 
                                className="bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/5 rounded-xl overflow-hidden transition-all duration-200 hover:border-neutral-300 dark:hover:border-white/10"
                            >
                                <div 
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full bg-opacity-10 ${log.status === 'success' ? 'bg-emerald-500/10' : log.status === 'error' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                                            {getStatusIcon(log.status)}
                                        </div>
                                        <div>
                                            <div className="font-medium flex items-center gap-3 text-neutral-900 dark:text-white">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getStatusBadge(log.status)}`}>
                                                    {log.status}
                                                </span>
                                                <span className="text-violet-600 dark:text-violet-400 font-mono">{log.event_name}</span>
                                            </div>
                                            <div className="text-xs text-neutral-500 dark:text-gray-500 mt-1 font-mono">
                                                Pixel: <span className="text-neutral-600 dark:text-gray-400">{log.pixel_id}</span> • Visitor: <span className="text-neutral-600 dark:text-gray-400">{log.visitor_id?.substring(0, 8)}...</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-neutral-500 dark:text-gray-500 font-medium">
                                        {formatDistanceToNow(new Date(log.created_at), { 
                                            addSuffix: true, 
                                            locale: ptBR 
                                        })}
                                    </div>
                                </div>
                                
                                {expandedLog === log.id && (
                                    <div className="border-t border-neutral-200 dark:border-white/5 bg-neutral-100 dark:bg-black/40 p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                        {log.error_message && (
                                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                                                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-bold uppercase mb-2">
                                                    <XCircle className="h-3 w-3" /> Detalhes do Erro
                                                </div>
                                                <div className="text-sm text-red-600/80 dark:text-red-300/80 font-mono">{log.error_message}</div>
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <div className="text-xs text-neutral-500 dark:text-gray-500 uppercase font-bold tracking-wider mb-3">Request Payload</div>
                                                <pre className="bg-white dark:bg-[#0F0F0F] border border-neutral-200 dark:border-white/5 p-4 rounded-lg text-[10px] text-neutral-600 dark:text-gray-300 overflow-auto max-h-60 font-mono shadow-inner">
                                                    {JSON.stringify(log.request_payload, null, 2)}
                                                </pre>
                                            </div>
                                            <div>
                                                <div className="text-xs text-neutral-500 dark:text-gray-500 uppercase font-bold tracking-wider mb-3">Response Data</div>
                                                <pre className="bg-white dark:bg-[#0F0F0F] border border-neutral-200 dark:border-white/5 p-4 rounded-lg text-[10px] text-emerald-600/80 dark:text-emerald-400/80 overflow-auto max-h-60 font-mono shadow-inner">
                                                    {JSON.stringify(log.response_payload, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
