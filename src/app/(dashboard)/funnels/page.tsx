"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Copy, Check, Trash2, Link as LinkIcon, ExternalLink, Pencil, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useSubscription } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";
import { getPlanLimits } from "@/config/subscription-plans";
import { createFunnel, updateFunnel } from "@/app/actions/funnels";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Funnel {
    id: string;
    name: string;
    slug: string;
    pixel_id: string; // legacy/primary
    bot_id: string;
    created_at: string;
    pixels?: { name: string };
    telegram_bots?: { name: string };
    funnel_pixels?: {
        pixel_id: string;
        pixels: { name: string };
    }[];
}

export default function FunnelsPage() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [pixels, setPixels] = useState<any[]>([]);
    const [bots, setBots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const { isSubscribed, isLoading: subLoading, plan: planName } = useSubscription();
    const router = useRouter();
    const planLimits = getPlanLimits(planName);

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        pixel_ids: [] as string[],
        bot_id: ""
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const [hasVerifiedDomain, setHasVerifiedDomain] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        fetchFunnels();
        fetchOptions();
    }, []);

    async function fetchOptions() {
        const { data: pixelsData } = await supabase.from("pixels").select("id, name");
        if (pixelsData) setPixels(pixelsData);

        const { data: botsData } = await supabase.from("telegram_bots").select("id, name");
        if (botsData) setBots(botsData);

        const { data: domainsData } = await supabase.from("domains").select("id, verified").eq("verified", true).limit(1);
        if (domainsData && domainsData.length > 0) {
            setHasVerifiedDomain(true);
        }
    }

    async function fetchFunnels() {
        setLoading(true);
        const { data, error } = await supabase
            .from("funnels")
            .select(`
            *,
            pixels:pixels!funnels_pixel_id_fkey (name),
            telegram_bots (name),
            funnel_pixels (
                pixel_id,
                pixels (name)
            )
        `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
        } else {
            setFunnels(data || []);
        }
        setLoading(false);
    }

    const handleNewFunnel = () => {
        if (subLoading) return;

        if (!isSubscribed) {
            toast.error("Assine um plano para criar funis e liberar todos os recursos.");
            router.push("/subscription");
            return;
        }

        if (!hasVerifiedDomain) {
            toast.error("Domínio verificado necessário", {
                description: "Você precisa ter pelo menos um domínio verificado para criar funis.",
                action: {
                    label: "Ir para Domínios",
                    onClick: () => router.push("/domains")
                }
            });
            return;
        }

        if (planLimits && planLimits.funnels !== 'unlimited' && funnels.length >= planLimits.funnels) {
            toast.error(`Seu plano permite apenas ${planLimits.funnels} funis. Faça upgrade para adicionar mais.`);
            router.push("/subscription");
            return;
        }

        setEditingId(null);
        setFormData({ name: "", slug: "", pixel_ids: [], bot_id: "" });
        setOpen(true);
    };

    const handleEditFunnel = (funnel: Funnel) => {
        setEditingId(funnel.id);
        const linkedPixelIds = funnel.funnel_pixels?.map(fp => fp.pixel_id) || [];
        // Se nao tiver funnel_pixels (migracao), usa o pixel_id antigo
        if (linkedPixelIds.length === 0 && funnel.pixel_id) {
            linkedPixelIds.push(funnel.pixel_id);
        }

        setFormData({
            name: funnel.name,
            slug: funnel.slug,
            pixel_ids: linkedPixelIds,
            bot_id: funnel.bot_id
        });
        setOpen(true);
    };

    async function handleSave() {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast.error("Login necessário.");
            setSaving(false);
            return;
        }

        if (!formData.name) {
            toast.error("Nome da campanha é obrigatório.");
            setSaving(false);
            return;
        }

        if (formData.pixel_ids.length === 0) {
            toast.error("Selecione pelo menos um Pixel.");
            setSaving(false);
            return;
        }

        if (!formData.bot_id) {
            toast.error("Selecione um Bot/Canal de destino.");
            setSaving(false);
            return;
        }

        if (!formData.slug) {
            formData.slug = formData.name.toLowerCase().replace(/ /g, "-") + "-" + Math.random().toString(36).substring(7);
        }

        try {
            if (editingId) {
                await updateFunnel(editingId, {
                    name: formData.name,
                    slug: formData.slug,
                    pixel_ids: formData.pixel_ids,
                    bot_id: formData.bot_id
                });
                toast.success("Funil atualizado com sucesso!");
            } else {
                await createFunnel({
                    name: formData.name,
                    slug: formData.slug,
                    pixel_ids: formData.pixel_ids,
                    bot_id: formData.bot_id
                });
                toast.success("Funil criado com sucesso!");
            }

            setOpen(false);
            setFormData({ name: "", slug: "", pixel_ids: [], bot_id: "" });
            fetchFunnels();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        }
        setSaving(false);
    }

    function handleCopyLink(slug: string) {
        const url = `${window.location.origin}/t/${slug}`;
        navigator.clipboard.writeText(url);
        setCopiedId(slug);
        toast.success("Link copiado!");
        setTimeout(() => setCopiedId(null), 2000);
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Tem certeza que deseja remover o funil "${name}"? Esta ação não pode ser desfeita.`)) {
            return;
        }

        setDeleting(id);

        // As FKs devem ter ON DELETE CASCADE idealmente, mas vamos deletar manual pra garantir
        await supabase.from("events").delete().eq("funnel_id", id);
        await supabase.from("visitor_telegram_links").delete().eq("funnel_id", id);
        await supabase.from("funnel_pixels").delete().eq("funnel_id", id);
        await supabase.from("capi_logs").delete().eq("funnel_id", id);

        const { error } = await supabase.from("funnels").delete().eq("id", id);

        if (error) {
            console.error(error);
            toast.error("Erro ao deletar funil: " + error.message);
        } else {
            toast.success("Funil removido com sucesso");
            fetchFunnels();
        }

        setDeleting(null);
    }

    const togglePixelSelection = (pixelId: string) => {
        setFormData(prev => {
            const exists = prev.pixel_ids.includes(pixelId);
            if (exists) {
                return { ...prev, pixel_ids: prev.pixel_ids.filter(id => id !== pixelId) };
            } else {
                return { ...prev, pixel_ids: [...prev.pixel_ids, pixelId] };
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Funis de Rastreamento" description="Crie links de rastreamento para suas campanhas e monitore a conversão.">
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${isSubscribed ? "bg-violet-500" : "bg-gray-500"} animate-pulse`} />
                        {!isSubscribed
                            ? "0 / 0 funis"
                            : planLimits?.funnels === 9999 || planLimits?.funnels === 'unlimited'
                                ? "Ilimitado"
                                : `${funnels.length} / ${planLimits?.funnels || 0} funis`}
                    </div>
                </div>
                <Button
                    onClick={handleNewFunnel}
                    className="bg-white text-black hover:bg-gray-200 gap-2 font-bold"
                >
                    <Plus className="h-4 w-4" />
                    Novo Funil
                </Button>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="sm:max-w-[500px] bg-[#0a0a0a] border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-white">
                                {editingId ? "Editar Funil" : "Criar Link de Rastreamento"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-gray-400">Nome da Campanha</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Campanha FB Ads #01"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-black/40 border-white/10 text-white placeholder:text-gray-700"
                                />
                            </div>


                            <div className="grid gap-2">
                                <Label className="text-gray-400">Pixel do Facebook (Multi-seleção)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between bg-black/40 border-white/10 text-white hover:bg-white/5">
                                            {formData.pixel_ids.length > 0
                                                ? `${formData.pixel_ids.length} pixel(s) selecionado(s)`
                                                : "Selecione Pixels"}
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 bg-[#0a0a0a] border-white/10">
                                        <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
                                            {pixels.length === 0 ? (
                                                <div className="p-2 text-sm text-gray-500 text-center">Nenhum pixel cadastrado.</div>
                                            ) : (
                                                pixels.map(pixel => {
                                                    const isSelected = formData.pixel_ids.includes(pixel.id);
                                                    return (
                                                        <div
                                                            key={pixel.id}
                                                            onClick={() => togglePixelSelection(pixel.id)}
                                                            className={`
                                                                flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer transition-colors
                                                                ${isSelected ? "bg-violet-600/20 text-violet-300" : "text-gray-300 hover:bg-white/5"}
                                                            `}
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "bg-violet-600 border-violet-600" : "border-gray-600"}`}>
                                                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                                            </div>
                                                            {pixel.name}
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {formData.pixel_ids.map(pid => {
                                        const px = pixels.find(p => p.id === pid);
                                        return px ? (
                                            <Badge key={pid} variant="secondary" className="text-[10px] bg-violet-900/40 text-violet-300 border-violet-700/50">
                                                {px.name}
                                                <X
                                                    className="ml-1 h-3 w-3 cursor-pointer hover:text-white"
                                                    onClick={() => togglePixelSelection(pid)}
                                                />
                                            </Badge>
                                        ) : null
                                    })}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-gray-400">Canal de Destino (Bot)</Label>
                                <Select
                                    value={formData.bot_id}
                                    onValueChange={(val) => setFormData({ ...formData, bot_id: val })}
                                >
                                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                                        <SelectValue placeholder="Selecione um Bot" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                                        {bots.map(b => (
                                            <SelectItem key={b.id} value={b.id} className="focus:bg-white/10 focus:text-white">{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent border-white/10 hover:bg-white/5 text-gray-400">Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingId ? "Salvar Alterações" : "Criar Link"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 font-medium">Campanha</th>
                            <th className="px-6 py-4 font-medium">Link Gerado</th>
                            <th className="px-6 py-4 font-medium">Configurações</th>
                            <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-violet-500">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : funnels.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    Você ainda não criou nenhum funil.
                                </td>
                            </tr>
                        ) : (
                            funnels.map(funnel => {
                                const linkedPixels = funnel.funnel_pixels?.map(fp => fp.pixels.name);
                                const pixelDisplay = linkedPixels && linkedPixels.length > 0
                                    ? linkedPixels.join(", ") // Mostra todos se tiver
                                    : funnel.pixels?.name || '-'; // Fallback

                                return (
                                    <tr key={funnel.id} className="hover:bg-white/5 transition-colors group text-gray-300">
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 hidden sm:block">
                                                <LinkIcon className="h-4 w-4" />
                                            </div>
                                            {funnel.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5 text-xs font-mono max-w-[300px] overflow-hidden group/link">
                                                <span className="truncate text-gray-400 group-hover/link:text-gray-300 transition-colors">
                                                    {typeof window !== 'undefined' ? `${window.location.origin}/t/${funnel.slug}` : `/t/${funnel.slug}`}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0 text-gray-500 hover:text-white hover:bg-white/10"
                                                    onClick={() => handleCopyLink(funnel.slug)}
                                                >
                                                    {copiedId === funnel.slug ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                                </Button>
                                                <a
                                                    href={`/t/${funnel.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-6 w-6 flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/10"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                    Pixel: <span className="text-gray-300 truncate max-w-[150px]" title={pixelDisplay}>{pixelDisplay}</span>
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Bot: <span className="text-gray-300">{funnel.telegram_bots?.name || '-'}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-500 hover:text-white hover:bg-white/10"
                                                    onClick={() => handleEditFunnel(funnel)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                                                    onClick={() => handleDelete(funnel.id, funnel.name)}
                                                    disabled={deleting === funnel.id}
                                                >
                                                    {deleting === funnel.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
