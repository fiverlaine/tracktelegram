"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Copy, Lock, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface DomainScriptStatus {
    id: string;
    domain: string;
    verified: boolean;
    has_pixel: boolean;
    has_funnel: boolean;
    has_channel: boolean;
}

export default function ScriptsPage() {
    const [domains, setDomains] = useState<DomainScriptStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchDomains();
    }, []);

    async function fetchDomains() {
        setLoading(true);
        const { data, error } = await supabase
            .from("domains")
            .select(`
                id,
                domain,
                verified,
                funnel_id,
                pixels:pixels!domains_pixel_id_fkey (id),
                domain_pixels (pixel_id),
                funnels (
                    id,
                    bot_id
                )
            `);

        if (error) {
            console.error("Error fetching domains:", error);
            toast.error("Erro ao carregar domínios.");
        } else {
            const mapped = data.map((d: any) => {
                const hasPixel = !!(d.pixels?.id || (d.domain_pixels && d.domain_pixels.length > 0));
                const hasFunnel = !!d.funnel_id;
                const hasChannel = !!(d.funnels?.bot_id);

                return {
                    id: d.id,
                    domain: d.domain,
                    verified: d.verified,
                    has_pixel: hasPixel,
                    has_funnel: hasFunnel,
                    has_channel: hasChannel
                };
            });
            setDomains(mapped);
        }
        setLoading(false);
    }

    const copyScript = (domainId: string) => {
        const code = `<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true; 
    j.src='${window.location.origin}/api/tracking-script.js?id=${domainId}';
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','trackGramLayer','${domainId}');
</script>`;
        navigator.clipboard.writeText(code);
        toast.success("Script copiado para a área de transferência!");
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader 
                title="Scripts de Rastreamento" 
                description="Gerencie e instale os scripts de rastreamento em seus domínios."
            />

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
            ) : domains.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 rounded-full bg-white/5 mb-4">
                            <AlertTriangle className="h-8 w-8 text-yellow-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Nenhum domínio encontrado</h3>
                        <p className="text-gray-400 max-w-md mb-6">
                            Para gerar um script de rastreamento, você precisa primeiro adicionar um domínio.
                        </p>
                        <Link href="/domains">
                            <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                                Adicionar Domínio
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {domains.map((domain) => {
                        const isReady = domain.has_pixel && domain.has_funnel && domain.has_channel;

                        return (
                            <Card key={domain.id} className="bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border-neutral-200 dark:border-white/5 overflow-hidden">
                                <CardHeader className="border-b border-neutral-100 dark:border-white/5 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                {domain.domain}
                                                {domain.verified ? (
                                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Verificado
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] gap-1">
                                                        <AlertTriangle className="h-3 w-3" /> Não Verificado
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                ID: {domain.id}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!isReady && (
                                                <Badge variant="outline" className="border-red-500/20 text-red-500 bg-red-500/5">
                                                    Configuração Pendente
                                                </Badge>
                                            )}
                                            {isReady && (
                                                <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 bg-emerald-500/5">
                                                    Pronto para Uso
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 grid md:grid-cols-3 gap-6">
                                    {/* Checklist Column */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Requisitos</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-full ${domain.has_pixel ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                                        {domain.has_pixel ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                    </div>
                                                    <span className="text-sm font-medium">Pixel Configurado</span>
                                                </div>
                                                {!domain.has_pixel && (
                                                    <Link href="/pixels">
                                                        <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-white/10">Resolver <ExternalLink className="ml-1 h-3 w-3" /></Button>
                                                    </Link>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-full ${domain.has_funnel ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                                        {domain.has_funnel ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                    </div>
                                                    <span className="text-sm font-medium">Funil Vinculado</span>
                                                </div>
                                                {!domain.has_funnel && (
                                                    <Link href="/domains">
                                                        <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-white/10">Resolver <ExternalLink className="ml-1 h-3 w-3" /></Button>
                                                    </Link>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-full ${domain.has_channel ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                                        {domain.has_channel ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                    </div>
                                                    <span className="text-sm font-medium">Canal Conectado</span>
                                                </div>
                                                {!domain.has_channel && (
                                                    <Link href="/funnels">
                                                        <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-white/10">Resolver <ExternalLink className="ml-1 h-3 w-3" /></Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Script Column */}
                                    <div className="md:col-span-2 space-y-4">
                                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Script de Instalação</h4>
                                        
                                        <div className="relative group">
                                            <div className={`
                                                bg-[#0F0F0F] border border-white/10 rounded-xl p-4 font-mono text-xs text-gray-300 overflow-x-auto transition-all duration-300
                                                ${!isReady ? 'blur-sm select-none opacity-50 pointer-events-none' : ''}
                                            `}>
                                                <pre>{`<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true; 
    j.src='${typeof window !== 'undefined' ? window.location.origin : ''}/api/tracking-script.js?id=${domain.id}';
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','trackGramLayer','${domain.id}');
</script>`}</pre>
                                            </div>

                                            {!isReady && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                                    <div className="bg-neutral-900/90 backdrop-blur-md border border-white/10 p-6 rounded-2xl text-center shadow-2xl max-w-sm mx-auto">
                                                        <Lock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                                                        <h5 className="font-semibold text-white mb-1">Script Bloqueado</h5>
                                                        <p className="text-sm text-gray-400">
                                                            Complete a configuração dos requisitos ao lado para liberar o script de rastreamento.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {isReady && (
                                                <Button
                                                    size="sm"
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black hover:bg-gray-200"
                                                    onClick={() => copyScript(domain.id)}
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copiar
                                                </Button>
                                            )}
                                        </div>

                                        {isReady && (
                                            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl text-sm">
                                                <h4 className="font-semibold text-blue-400 mb-2">Instruções:</h4>
                                                <ol className="list-decimal pl-4 space-y-1 text-gray-400">
                                                    <li>Copie o script acima.</li>
                                                    <li>Cole no <code className="bg-white/10 px-1 py-0.5 rounded text-gray-300">&lt;head&gt;</code> de todas as páginas do seu site <strong>{domain.domain}</strong>.</li>
                                                    <li>O script ativará automaticamente o rastreamento e os pixels configurados.</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
