"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ScriptsPage() {
    const [loading, setLoading] = useState(true);
    const [checks, setChecks] = useState({
        hasPixel: false,
        hasChannel: false,
        hasFunnel: false
    });
    const [origin, setOrigin] = useState("");

    const supabase = createClient();

    useEffect(() => {
        setOrigin(window.location.origin);
        checkRequirements();
    }, []);

    async function checkRequirements() {
        setLoading(true);
        try {
            const [pixels, channels, funnels] = await Promise.all([
                supabase.from("pixels").select("id", { count: "exact", head: true }),
                supabase.from("telegram_bots").select("id", { count: "exact", head: true }),
                supabase.from("funnels").select("id", { count: "exact", head: true })
            ]);

            setChecks({
                hasPixel: (pixels.count || 0) > 0,
                hasChannel: (channels.count || 0) > 0,
                hasFunnel: (funnels.count || 0) > 0
            });
        } catch (error) {
            console.error("Erro ao verificar requisitos:", error);
        } finally {
            setLoading(false);
        }
    }

    const isReady = checks.hasPixel && checks.hasChannel && checks.hasFunnel;

    const scriptCode = `<script src="${origin}/api/tracking-script.js"></script>`;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader 
                title="Scripts de Rastreamento" 
                description="Instale este script em suas páginas para habilitar o rastreamento inteligente."
            />

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
            ) : (
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Coluna da Esquerda: Checklist */}
                    <Card className="bg-white/50 dark:bg-white/5 border-neutral-200 dark:border-white/10">
                        <CardHeader>
                            <CardTitle>Requisitos de Instalação</CardTitle>
                            <CardDescription>
                                Para garantir que o rastreamento funcione corretamente, você precisa configurar os seguintes itens:
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <RequirementItem 
                                label="Configurar Pixel do Facebook" 
                                checked={checks.hasPixel} 
                                href="/pixels"
                            />
                            <RequirementItem 
                                label="Conectar Canal do Telegram" 
                                checked={checks.hasChannel} 
                                href="/channels"
                            />
                            <RequirementItem 
                                label="Criar pelo menos um Funil" 
                                checked={checks.hasFunnel} 
                                href="/funnels"
                            />
                        </CardContent>
                    </Card>

                    {/* Coluna da Direita: Script */}
                    <Card className={`bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-white/10 relative overflow-hidden transition-all duration-500 ${!isReady ? 'border-red-500/20' : 'border-violet-500/20'}`}>
                        {!isReady && (
                            <div className="absolute inset-0 z-10 bg-white/60 dark:bg-black/60 backdrop-blur-[6px] flex flex-col items-center justify-center p-6 text-center">
                                <div className="bg-red-500/10 p-4 rounded-full mb-4">
                                    <AlertTriangle className="h-8 w-8 text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                                    Script Bloqueado
                                </h3>
                                <p className="text-sm text-neutral-500 dark:text-gray-400 max-w-xs">
                                    Complete os requisitos ao lado para liberar seu script de rastreamento exclusivo.
                                </p>
                            </div>
                        )}

                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-lg text-violet-600 dark:text-violet-400">
                                    <Copy className="h-5 w-5" />
                                </div>
                                Seu Script Universal
                            </CardTitle>
                            <CardDescription>
                                Copie e cole este código no <code>&lt;head&gt;</code> de todas as suas páginas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative group">
                                <div className="bg-neutral-900 dark:bg-black border border-neutral-800 dark:border-white/10 rounded-xl p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                                    <pre>{scriptCode}</pre>
                                </div>
                                <Button
                                    size="sm"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black hover:bg-gray-200"
                                    onClick={() => {
                                        navigator.clipboard.writeText(scriptCode);
                                        toast.success("Script copiado para a área de transferência!");
                                    }}
                                    disabled={!isReady}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copiar
                                </Button>
                            </div>

                            <div className="mt-6 bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                                    Como usar:
                                </h4>
                                <ul className="text-xs text-neutral-600 dark:text-gray-400 space-y-2 list-disc pl-4">
                                    <li>Instale o script acima no topo do seu site.</li>
                                    <li>
                                        Nos seus botões, adicione o atributo: <br/>
                                        <code className="bg-neutral-100 dark:bg-white/10 px-1 py-0.5 rounded text-violet-600 dark:text-violet-400">data-trackgram-slug="seu-funil"</code>
                                    </li>
                                    <li>O sistema irá interceptar o clique e redirecionar automaticamente.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function RequirementItem({ label, checked, href }: { label: string, checked: boolean, href: string }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/5 border border-neutral-100 dark:border-white/5">
            <div className="flex items-center gap-3">
                {checked ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                    <XCircle className="h-5 w-5 text-neutral-300 dark:text-neutral-600" />
                )}
                <span className={`text-sm font-medium ${checked ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-gray-400'}`}>
                    {label}
                </span>
            </div>
            {!checked && (
                <Link href={href}>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                        Resolver
                    </Button>
                </Link>
            )}
        </div>
    );
}
