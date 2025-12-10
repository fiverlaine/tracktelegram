"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Globe, Trash2, CheckCircle2, Eye, Copy } from "lucide-react";
import { toast } from "sonner";

interface Domain {
    id: string;
    domain: string;
    verified: boolean;
    created_at: string;
    pixel_id?: string;
    pixels?: { name: string };
}

export default function DomainsPage() {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [pixels, setPixels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ domain: "", pixel_id: "" });
    const [saving, setSaving] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});

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
            .select("*, pixels(name)")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            toast.error("Erro ao carregar domínios");
        } else {
            setDomains(data || []);
        }
        setLoading(false);
    }

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

        const { error } = await supabase.from("domains").insert({
            user_id: user.id,
            domain: domainClean,
            pixel_id: formData.pixel_id || null, // Salvar Pixel vinculado
            verified: true // Auto-verified as requested
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Meus Domínios</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                            <Plus className="h-4 w-4" />
                            Adicionar Domínio
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Novo Domínio</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="domain">URL do Site</Label>
                                <Input
                                    id="domain"
                                    placeholder="exemplo.com.br"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Insira o domínio onde você instalará o script de rastreamento.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label>Pixel (Opcional)</Label>
                                <p className="text-[10px] text-muted-foreground mb-1">
                                    Se selecionado, o script instalará automaticamente o Pixel neste domínio.
                                </p>
                                <Select
                                    value={formData.pixel_id}
                                    onValueChange={(val) => setFormData({ ...formData, pixel_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um Pixel para Instalação Automática" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pixels.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddDomain} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Adicionar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : domains.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                        Nenhum domínio cadastrado. Adicione o site onde sua página de vendas está hospedada.
                    </div>
                ) : (
                    <div className="rounded-md border border-border bg-card/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Domínio</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {domains.map(domain => (
                                    <TableRow key={domain.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-muted-foreground" />
                                            {domain.domain}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-green-500 text-sm">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Ativo
                                            </div>
                                            {domain.pixels?.name && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Pixel: {domain.pixels.name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Dialog open={detailsOpen[domain.id] || false} onOpenChange={(open) => setDetailsOpen(prev => ({ ...prev, [domain.id]: open }))}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Ver detalhes e script"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2">
                                                                <Globe className="h-5 w-5 text-primary" />
                                                                Detalhes: {domain.domain}
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-6 py-4">
                                                            {/* Status */}
                                                            <div className="flex items-center gap-2 text-green-500 text-sm">
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                <span className="font-medium">Domínio Ativo</span>
                                                            </div>

                                                            {/* Script de Instalação */}
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <h3 className="font-semibold mb-2">Script de Rastreamento</h3>
                                                                    <p className="text-sm text-muted-foreground mb-3">
                                                                        Copie o script abaixo e cole no <code className="bg-muted px-1 py-0.5 rounded">&lt;head&gt;</code> de todas as páginas do seu site <strong>{domain.domain}</strong>.
                                                                        Este script é responsável por capturar os dados do Facebook e identificar o usuário.
                                                                    </p>
                                                                </div>
                                                                
                                                                <div className="bg-muted p-4 rounded-md font-mono text-xs overflow-x-auto relative group">
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
                                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg text-sm">
                                                                <h4 className="font-semibold text-blue-400 mb-2">Instruções de Instalação:</h4>
                                                                <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                                                                    <li>Copie o script acima</li>
                                                                    <li>Cole no <code className="bg-muted px-1 py-0.5 rounded">&lt;head&gt;</code> de todas as páginas do seu site</li>
                                                                    <li>Certifique-se de que o script está presente antes do fechamento da tag <code className="bg-muted px-1 py-0.5 rounded">&lt;/head&gt;</code></li>
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
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

        </div>
    );
}
