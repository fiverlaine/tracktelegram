"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case "error":
                return <XCircle className="h-5 w-5 text-red-500" />;
            case "skipped":
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            default:
                return <Clock className="h-5 w-5 text-gray-500" />;
        }
    }

    function getStatusBadge(status: string) {
        const colors = {
            success: "bg-green-500/20 text-green-400 border-green-500/30",
            error: "bg-red-500/20 text-red-400 border-red-500/30",
            skipped: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        };
        return colors[status as keyof typeof colors] || "bg-gray-500/20 text-gray-400";
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Logs CAPI</h1>
                    <p className="text-muted-foreground">Monitor de envios para Facebook Conversions API</p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Atualizar
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-card/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Total</CardDescription>
                        <CardTitle className="text-2xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-green-500/10 border-green-500/30">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-green-400">Sucesso</CardDescription>
                        <CardTitle className="text-2xl text-green-400">{stats.success}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-red-500/10 border-red-500/30">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-red-400">Erro</CardDescription>
                        <CardTitle className="text-2xl text-red-400">{stats.error}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-yellow-500/10 border-yellow-500/30">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-yellow-400">Ignorado</CardDescription>
                        <CardTitle className="text-2xl text-yellow-400">{stats.skipped}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Logs Table */}
            <Card className="bg-card/50">
                <CardHeader>
                    <CardTitle>Histórico de Envios</CardTitle>
                    <CardDescription>Últimos 50 eventos enviados para a CAPI</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin text-primary" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            Nenhum log encontrado. Os logs aparecerão aqui quando eventos forem enviados para o Facebook.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <div 
                                    key={log.id} 
                                    className="border border-border rounded-lg overflow-hidden"
                                >
                                    <div 
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {getStatusIcon(log.status)}
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadge(log.status)}`}>
                                                        {log.status.toUpperCase()}
                                                    </span>
                                                    <span className="text-primary">{log.event_name}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Pixel: {log.pixel_id} | Visitor: {log.visitor_id?.substring(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(log.created_at), { 
                                                addSuffix: true, 
                                                locale: ptBR 
                                            })}
                                        </div>
                                    </div>
                                    
                                    {expandedLog === log.id && (
                                        <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                                            {log.error_message && (
                                                <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                                                    <div className="text-xs text-red-400 font-medium mb-1">Erro:</div>
                                                    <div className="text-sm text-red-300">{log.error_message}</div>
                                                </div>
                                            )}
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-2">Request Payload:</div>
                                                    <pre className="bg-background/50 p-3 rounded text-xs overflow-auto max-h-60">
                                                        {JSON.stringify(log.request_payload, null, 2)}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-2">Response:</div>
                                                    <pre className="bg-background/50 p-3 rounded text-xs overflow-auto max-h-60">
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
                </CardContent>
            </Card>
        </div>
    );
}
