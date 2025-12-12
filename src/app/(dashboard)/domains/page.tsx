"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Globe, Trash2, CheckCircle2, Eye, Copy, Pencil, X, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useSubscription } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";
import { getPlanLimits } from "@/config/subscription-plans";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { verifyDomain } from "@/app/actions/domains";
import { ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";

interface Domain {
    id: string;
    domain: string;
    verified: boolean;
    verification_token?: string;
    created_at: string;
    pixel_id?: string;
    pixels?: { name: string };
    domain_pixels?: {
        pixel_id: string;
        pixels: { name: string };
    }[];
}

export default function DomainsPage() {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [pixels, setPixels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ domain: "", pixel_id: "" });
    const [saving, setSaving] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});

    const { isSubscribed, isLoading: subLoading, plan: planName } = useSubscription();
    const router = useRouter();
    const planLimits = getPlanLimits(planName);

    const supabase = createClient();

    useEffect(() => {
        fetchDomains();
        fetchPixels();
    }, []);

    async function fetchPixels() {
        const { data } = await supabase.from("pixels").select("id, name");
        if (data) setPixels(data);
    }

    async function fetchDomains() {
        setLoading(true);
        const { data, error } = await supabase
            .from("domains")
            .select("*, pixels:pixels!domains_pixel_id_fkey(name)")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            toast.error("Erro ao carregar domínios");
        } else {
            setDomains(data || []);
        }
        setLoading(false);
    }

    const handleNewDomain = () => {
        if (subLoading) return;
        
        if (!isSubscribed) {
            toast.error("Assine um plano para adicionar domínios.");
            router.push("/subscription");
            return;
        }

        if (planLimits && planLimits.domains !== 9999 && domains.length >= planLimits.domains) {
            toast.error(`Seu plano permite apenas ${planLimits.domains} domínios. Faça upgrade para adicionar mais.`);
            router.push("/subscription");
            return;
        }

        setOpen(true);
    };

    async function handleAddDomain() {
        if (!formData.domain) return;

        // Basic validation
        let domainClean = formData.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast.error("Login necessário");
            setSaving(false);
            return;
        }

        const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const { error } = await supabase.from("domains").insert({
            user_id: user.id,
            domain: domainClean,
            pixel_id: formData.pixel_id || null, 
            verified: false,
            verification_token: verificationToken
        });

        if (error) {
            console.error(error);
            toast.error("Erro ao adicionar domínio");
        } else {
            toast.success("Domínio adicionado!");
            setFormData({ domain: "", pixel_id: "" });
            setOpen(false);
            fetchDomains();
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        const { error } = await supabase.from("domains").delete().eq("id", id);
        if (error) {
            toast.error("Erro ao remover domínio");
        } else {
            toast.success("Domínio removido");
            fetchDomains();
        }
    }

    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    async function handleVerify(domain: Domain) {
        if (!domain.verification_token) return;
        
        setVerifyingId(domain.id);
        try {
            const result = await verifyDomain(domain.id);
            if (result.success) {
                toast.success(result.message);
                fetchDomains();
            } else {
                toast.error(result.message);
            }
        } catch (e: any) {
            toast.error(e.message);
        }
        setVerifyingId(null);
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Meus Domínios" description="Gerencie os domínios onde o script de rastreamento será instalado.">
                 <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs text-gray-400">
                    <span className={`w-2 h-2 rounded-full ${isSubscribed ? "bg-violet-500" : "bg-gray-500"} animate-pulse`} />
                    {!isSubscribed 
                        ? "0 / 0 domínios"
                        : planLimits?.domains === 9999 
                            ? "Ilimitado" 
                            : `${domains.length} / ${planLimits?.domains || 0} domínios`}
                </div>
                </div>
                <Button 
                    onClick={handleNewDomain} 
                    className="bg-white text-black hover:bg-gray-200 gap-2 font-bold"
                >
                    <Plus className="h-4 w-4" />
                    Adicionar Domínio
                </Button>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-white">Novo Domínio</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="domain" className="text-gray-400">URL do Site</Label>
                                <Input
                                    id="domain"
                                    placeholder="exemplo.com.br"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                    className="bg-black/40 border-white/10 text-white placeholder:text-gray-700"
                                />
                                <p className="text-xs text-gray-500">
                                    Insira o domínio onde você instalará o script de rastreamento.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-gray-400">Pixel (Opcional)</Label>
                                <p className="text-[10px] text-gray-500 mb-1">
                                    Se selecionado, o script instalará automaticamente o Pixel neste domínio.
                                </p>
                                <Select
                                    value={formData.pixel_id}
                                    onValueChange={(val) => setFormData({ ...formData, pixel_id: val })}
                                >
                                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                                        <SelectValue placeholder="Selecione um Pixel" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                                        {pixels.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="focus:bg-white/10 focus:text-white cursor-pointer">{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent border-white/10 hover:bg-white/5 text-gray-400">Cancelar</Button>
                            <Button onClick={handleAddDomain} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Adicionar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </PageHeader>
            
            {/* Rest of the component (domain list) */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-violet-500" /></div>
                ) : domains.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                        Nenhum domínio cadastrado. Adicione o site onde sua página de vendas está hospedada.
                    </div>
                ) : (
                    <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Domínio</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {domains.map(domain => (
                                    <tr key={domain.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white/5 text-gray-400">
                                                <Globe className="h-4 w-4" />
                                            </div>
                                            {domain.domain}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {domain.verified ? (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Verificado
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold">
                                                        <ShieldAlert className="h-3 w-3" />
                                                        Não Verificado
                                                    </div>
                                                )}
                                                {domain.pixels?.name && (
                                                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md">
                                                        {domain.pixels.name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-gray-400">
                                                <Dialog open={detailsOpen[domain.id] || false} onOpenChange={(open) => setDetailsOpen(prev => ({ ...prev, [domain.id]: open }))}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-white/10 hover:text-white"
                                                            title="Ver detalhes"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[600px] bg-[#0a0a0a] border-white/10 text-white max-h-[90vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2 text-white">
                                                                <Globe className="h-5 w-5 text-violet-500" />
                                                                Detalhes: {domain.domain}
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-6 py-4">
                                                            {/* Status e Verificação */}
                                                            <div className="space-y-4">
                                                                {!domain.verified && (
                                                                    <div className="bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-xl space-y-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <h4 className="font-semibold text-yellow-500 flex items-center gap-2">
                                                                                <ShieldAlert className="h-4 w-4" />
                                                                                Verificação de Domínio Necessária
                                                                            </h4>
                                                                            {verifyingId === domain.id ? (
                                                                                <Button disabled size="sm" variant="outline" className="border-yellow-500/20 text-yellow-500">
                                                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                                    Verificando...
                                                                                </Button>
                                                                            ) : (
                                                                                 <Button onClick={() => handleVerify(domain)} size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white border-0">
                                                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                                                    Verificar Agora
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <div className="text-sm text-gray-400">
                                                                            <p className="mb-2">Para verificar que você é o dono deste domínio, adicione um registro <strong>TXT</strong> no seu DNS:</p>
                                                                            <div className="bg-black/30 p-2 rounded border border-white/5 flex items-center justify-between font-mono text-xs">
                                                                                <span>trackgram={domain.verification_token}</span>
                                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-white" onClick={() => {
                                                                                    navigator.clipboard.writeText(`trackgram=${domain.verification_token}`);
                                                                                    toast.success("Token copiado!");
                                                                                }}>
                                                                                    <Copy className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                {domain.verified && (
                                                                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                                                                        <ShieldCheck className="h-4 w-4" />
                                                                        <span>Domínio Verificado e Seguro</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Script de Instalação */}
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <h3 className="font-semibold text-white mb-2">Script de Rastreamento</h3>
                                                                    <p className="text-sm text-gray-400 mb-3">
                                                                        Copie o script abaixo e cole no <code className="bg-white/10 px-1 py-0.5 rounded text-gray-300">&lt;head&gt;</code> de todas as páginas do seu site <strong>{domain.domain}</strong>.
                                                                    </p>
                                                                </div>
                                                                
                                                                <div className="bg-black/50 border border-white/10 p-4 rounded-xl font-mono text-xs overflow-x-auto relative group text-gray-300">
                                                                    <pre className="whitespace-pre-wrap">
{`<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true; 
    j.src='${typeof window !== 'undefined' ? window.location.origin : ''}/api/tracking-script.js?id=${domain.id}';
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','trackGramLayer','${domain.id}');
</script>`}
                                                                    </pre>
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black hover:bg-gray-200"
                                                                        onClick={() => {
                                                                            const code = `<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true; 
    j.src='${window.location.origin}/api/tracking-script.js?id=${domain.id}';
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','trackGramLayer','${domain.id}');
</script>`;
                                                                            navigator.clipboard.writeText(code);
                                                                            toast.success("Script copiado!");
                                                                        }}
                                                                    >
                                                                        <Copy className="h-4 w-4 mr-2" />
                                                                        Copiar
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Instruções */}
                                                            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl text-sm">
                                                                <h4 className="font-semibold text-blue-400 mb-2">Instruções de Instalação:</h4>
                                                                <ol className="list-decimal pl-4 space-y-1 text-gray-400">
                                                                    <li>Copie o script acima</li>
                                                                    <li>Cole no <code className="bg-white/10 px-1 py-0.5 rounded text-gray-300">&lt;head&gt;</code> de todas as páginas do seu site</li>
                                                                    <li>Certifique-se de que o script está presente antes do fechamento da tag <code className="bg-white/10 px-1 py-0.5 rounded text-gray-300">&lt;/head&gt;</code></li>
                                                                    <li>O script funciona automaticamente após a instalação</li>
                                                                </ol>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(domain.id)}
                                                    className="hover:bg-red-500/10 hover:text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
