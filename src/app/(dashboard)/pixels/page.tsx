"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";

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
        } else {
            setPixels(data || []);
        }
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);

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

        const { data: funnels } = await supabase
            .from("funnels")
            .select("id, name")
            .eq("pixel_id", id);

        if (funnels && funnels.length > 0) {
            await supabase
                .from("funnels")
                .update({ pixel_id: null })
                .eq("pixel_id", id);
            
            toast.info(`${funnels.length} funil(is) desvinculado(s) do pixel`);
        }

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
             <PageHeader title="Pixels do Facebook" description="Gerencie seus Pixels para rastreamento de conversões via API (CAPI).">
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-white text-black hover:bg-gray-200 gap-2 font-bold">
                            <Plus className="h-4 w-4" />
                            Novo Pixel
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-white">Novo Pixel do Facebook</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-gray-400">Nome de Identificação</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Pixel Principal"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-black/40 border-white/10 text-white placeholder:text-gray-700"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="pixel_id" className="text-gray-400">Pixel ID</Label>
                                <Input
                                    id="pixel_id"
                                    placeholder="1234567890"
                                    value={formData.pixel_id}
                                    onChange={(e) => setFormData({ ...formData, pixel_id: e.target.value })}
                                    className="bg-black/40 border-white/10 text-white placeholder:text-gray-700"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="token" className="text-gray-400">Access Token (CAPI)</Label>
                                <Input
                                    id="token"
                                    placeholder="EAAB..."
                                    value={formData.access_token}
                                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                                     className="bg-black/40 border-white/10 text-white placeholder:text-gray-700"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent border-white/10 hover:bg-white/5 text-gray-400">Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 font-medium">Nome</th>
                            <th className="px-6 py-4 font-medium">Pixel ID</th>
                            <th className="px-6 py-4 font-medium">Token</th>
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
                        ) : pixels.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    Nenhum pixel cadastrado.
                                </td>
                            </tr>
                        ) : (
                            pixels.map((pixel) => (
                                <tr key={pixel.id} className="hover:bg-white/5 transition-colors group text-gray-300">
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                            <BarChart2 className="h-4 w-4" />
                                        </div>
                                        {pixel.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{pixel.pixel_id}</td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs max-w-[150px] truncate">
                                        {pixel.access_token.substring(0, 10)}...
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="hover:bg-red-500/10 hover:text-red-400 text-gray-500"
                                            onClick={() => handleDelete(pixel.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
