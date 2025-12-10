"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ArrowRight, Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Funnel {
    id: string;
    name: string;
    slug: string;
    pixel_id: string;
    bot_id: string;
    created_at: string;
    pixels?: { name: string };
    telegram_bots?: { name: string };
}

export default function FunnelsPage() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [pixels, setPixels] = useState<any[]>([]);
    const [bots, setBots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        pixel_id: "",
        bot_id: ""
    });
    const [saving, setSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

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
    }

    async function fetchFunnels() {
        setLoading(true);
        const { data, error } = await supabase
            .from("funnels")
            .select(`
            *,
            pixels (name),
            telegram_bots (name)
        `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
        } else {
            setFunnels(data || []);
        }
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast.error("Login necessário.");
            setSaving(false);
            return;
        }

        // Validações obrigatórias
        if (!formData.name) {
            toast.error("Nome da campanha é obrigatório.");
            setSaving(false);
            return;
        }

        if (!formData.pixel_id) {
            toast.error("Selecione um Pixel do Facebook.");
            setSaving(false);
            return;
        }

        if (!formData.bot_id) {
            toast.error("Selecione um Bot/Canal de destino.");
            setSaving(false);
            return;
        }

        if (!formData.slug) {
            // Auto-generate slug if not provided
            formData.slug = formData.name.toLowerCase().replace(/ /g, "-") + "-" + Math.random().toString(36).substring(7);
        }

        const { error } = await supabase.from("funnels").insert({
            user_id: user.id,
            name: formData.name,
            slug: formData.slug,
            pixel_id: formData.pixel_id,
            bot_id: formData.bot_id
        });

        if (error) {
            console.error(error);
            if (error.code === '23505') {
                toast.error("Este slug já existe. Escolha outro.");
            } else {
                toast.error("Erro ao criar funil");
            }
        } else {
            toast.success("Funil criado com sucesso!");
            setOpen(false);
            setFormData({ name: "", slug: "", pixel_id: "", bot_id: "" });
            fetchFunnels();
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

        // Deletar eventos relacionados primeiro (opcional, mas limpa o banco)
        await supabase
            .from("events")
            .delete()
            .eq("funnel_id", id);

        // Deletar links de visitantes relacionados
        await supabase
            .from("visitor_telegram_links")
            .delete()
            .eq("funnel_id", id);

        // Agora deletar o funil
        const { error } = await supabase
            .from("funnels")
            .delete()
            .eq("id", id);

        if (error) {
            console.error(error);
            toast.error("Erro ao deletar funil: " + error.message);
        } else {
            toast.success("Funil removido com sucesso");
            fetchFunnels();
        }

        setDeleting(null);
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Funis de Rastreamento</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Funil
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-card border-border">
                        <DialogHeader>
                            <DialogTitle>Criar Link de Rastreamento</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome da Campanha</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Campanha FB Ads #01"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug Personalizado (Opcional)</Label>
                                <Input
                                    id="slug"
                                    placeholder="promocao-especial"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                />
                                <p className="text-[10px] text-muted-foreground">O link final será: {typeof window !== 'undefined' ? window.location.origin : '...'}/t/seu-slug</p>
                            </div>
                            <div className="grid gap-2">
                                <Label>Pixel do Facebook</Label>
                                <Select
                                    value={formData.pixel_id}
                                    onValueChange={(val) => setFormData({ ...formData, pixel_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um Pixel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pixels.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Canal de Destino (Bot)</Label>
                                <Select
                                    value={formData.bot_id}
                                    onValueChange={(val) => setFormData({ ...formData, bot_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um Bot" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bots.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-primary text-white">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Link
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : funnels.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                        Você ainda não criou nenhum funil.
                    </div>
                ) : (
                    <div className="rounded-md border border-border bg-card/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border">
                                    <TableHead>Campanha</TableHead>
                                    <TableHead>Link Gerado</TableHead>
                                    <TableHead>Configurações</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {funnels.map(funnel => (
                                    <TableRow key={funnel.id} className="hover:bg-muted/50 border-border">
                                        <TableCell className="font-medium">{funnel.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 bg-background/50 p-2 rounded-md border border-border text-xs font-mono max-w-[300px] overflow-hidden">
                                                <span className="truncate">{typeof window !== 'undefined' ? `${window.location.origin}/t/${funnel.slug}` : `/t/${funnel.slug}`}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0"
                                                    onClick={() => handleCopyLink(funnel.slug)}
                                                >
                                                    {copiedId === funnel.slug ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            Pixel: {funnel.pixels?.name || '-'} <br />
                                            Bot: {funnel.telegram_bots?.name || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                onClick={() => handleDelete(funnel.id, funnel.name)}
                                                disabled={deleting === funnel.id}
                                            >
                                                {deleting === funnel.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
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
