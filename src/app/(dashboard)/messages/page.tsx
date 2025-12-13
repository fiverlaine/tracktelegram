import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";
import MessagesClient from "./messages-client";

export default async function MessagesPage() {
    const supabase = await createClient();

    // Buscar funis para o dropdown
    const { data: funnels } = await supabase
        .from("funnels")
        .select("id, name")
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Mensagens" description="Gerencie as mensagens automáticas enviadas pelo bot." />

            <MessagesClient initialFunnels={funnels || []} />
        </div>
    );
}
