import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { visitor_id, event_type, metadata, domain_id } = body;

        if (!visitor_id || !event_type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Tentativa de encontrar o Funnel ID baseado no domain_id (se houver lógica para isso)
        // Por enquanto, vamos inserir sem funnel_id se não for explícito, 
        // mas o Dashboard atual conta tudo da tabela events, então vai funcionar.
        // Se quisermos ser mais precisos, poderíamos tentar cruzar domain -> pixel -> funnel?
        // Mas a relação não é direta 1:1 necessariamente.
        
        // Deduplicação: Verificar se já existe evento recente (5 min)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data: recentEvents } = await supabase
            .from("events")
            .select("id")
            .eq("visitor_id", visitor_id)
            .eq("event_type", event_type)
            .gte("created_at", fiveMinutesAgo)
            .limit(1);

        if (recentEvents && recentEvents.length > 0) {
            // Evento duplicado recente, não gravar
            return NextResponse.json({ success: true, skipped: true }, {
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }

        // Inserir evento
        const { error } = await supabase.from("events").insert({
            visitor_id,
            event_type,
            metadata: {
                ...metadata,
                domain_id, // Guardar referência do domínio
                source: "external_script"
            }
        });

        if (error) {

            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        return NextResponse.json({ success: true }, {
            headers: {
                "Access-Control-Allow-Origin": "*",
            }
        });

    } catch (err) {
        console.error("Erro na API de track:", err);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
