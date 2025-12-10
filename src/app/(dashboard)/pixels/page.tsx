"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Pixel {
    id: string;
    name: string;
    pixel_id: string;
    access_token: string;
    created_at: string;
}

export default function PixelsPage() {
    const [pixels, setPixels] = useState<Pixel[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", pixel_id: "", access_token: "" });
    const [saving, setSaving] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        fetchPixels();
    }, []);

    async function fetchPixels() {
        setLoading(true);
        const { data, error } = await supabase.from("pixels").select("*").order("created_at", { ascending: false });
        if (error) {
            console.error(error);
            // toast.error("Erro ao carregar pixels");
        } else {
            setPixels(data || []);
        }
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        // user_id is automatically handled by RLS if logged in? No, we normally need to pass it, or default value?
        // references public.profiles(id). 
        // We need to get current user.

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast.error("Você precisa estar logado para criar um pixel.");
            setSaving(false);
            return;
        }

        const { error } = await supabase.from("pixels").insert({
            user_id: user.id,
            name: formData.name,
            pixel_id: formData.pixel_id,
            access_token: formData.access_token
        });

        if (error) {
            console.error(error);
            toast.error("Erro ao salvar pixel");
        } else {
            toast.success("Pixel salvo com sucesso");
            setOpen(false);
            setFormData({ name: "", pixel_id: "", access_token: "" });
            fetchPixels();
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja remover este pixel? Funis que usam este pixel serão desvinculados.")) {
            return;
        }

        // Verificar se há funis usando este pixel
        const { data: funnels } = await supabase
            .from("funnels")
            .select("id, name")
            .eq("pixel_id", id);

        if (funnels && funnels.length > 0) {
            // Desvincular funis primeiro
            await supabase
                .from("funnels")
                .update({ pixel_id: null })
                .eq("pixel_id", id);
            
            toast.info(`${funnels.length} funil(is) desvinculado(s) do pixel`);
        }

        // Agora deletar o pixel
        const { error } = await supabase.from("pixels").delete().eq("id", id);
        if (error) {
            console.error(error);
            if (error.code === '23503') {
                toast.error("Não é possível deletar: há registros relacionados");
            } else {
                toast.error("Erro ao deletar: " + error.message);
            }
        } else {
            toast.success("Pixel deletado com sucesso");
            fetchPixels();
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Pixels</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Pixel
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-card border-border">
                        <DialogHeader>
                            <DialogTitle>Novo Pixel do Facebook</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome de Identificação</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Pixel Principal"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pixel_id">Pixel ID</Label>
                                <Input
                                    id="pixel_id"
                                    placeholder="1234567890"
                                    value={formData.pixel_id}
                                    onChange={(e) => setFormData({ ...formData, pixel_id: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="token">Access Token (CAPI)</Label>
                                <Input
                                    id="token"
                                    placeholder="EAAB..."
                                    value={formData.access_token}
                                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-primary text-white">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border border-border bg-card/50 backdrop-blur-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-border">
                            <TableHead>Nome</TableHead>
                            <TableHead>Pixel ID</TableHead>
                            <TableHead>Token</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : pixels.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    Nenhum pixel cadastrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pixels.map((pixel) => (
                                <TableRow key={pixel.id} className="hover:bg-muted/50 border-border">
                                    <TableCell className="font-medium">{pixel.name}</TableCell>
                                    <TableCell>{pixel.pixel_id}</TableCell>
                                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                                        {pixel.access_token.substring(0, 10)}...
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive/90"
                                            onClick={() => handleDelete(pixel.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
