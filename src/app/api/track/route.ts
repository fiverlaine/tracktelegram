import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendCAPIEvent } from "@/lib/facebook-capi";

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

        // 1. Buscar Pixel vinculado ao dominio
        let pixelData = null;
        if (domain_id) {
            const { data: domain, error: domainError } = await supabase
                .from("domains")
                .select(`
                    pixel_id,
                    pixels (
                        id,
                        pixel_id,
                        access_token
                    )
                `)
                .eq("id", domain_id)
                .single();

            if (domain?.pixels) {
                // Supabase types can be tricky with relations, handle both array and object
                const pixelsRel = domain.pixels as any;
                pixelData = Array.isArray(pixelsRel) ? pixelsRel[0] : pixelsRel;
            }
        }

        // Inserir evento
        const { error } = await supabase.from("events").insert({
            visitor_id,
            event_type,
            funnel_id: null, // Pageview generico nao tem funil ainda
            metadata: {
                ...metadata,
                domain_id,
                source: "external_script"
            }
        });

        if (error) {
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        // 2. Disparar CAPI (PageView)
        if (event_type === 'pageview' && pixelData?.access_token && pixelData?.pixel_id) {
            // Fire & Forget para não travar a response
            (async () => {
                try {
                    await sendCAPIEvent(
                        pixelData.access_token,
                        pixelData.pixel_id,
                        "PageView",
                        {
                            fbc: metadata?.fbc,
                            fbp: metadata?.fbp,
                            user_agent: metadata?.user_agent,
                            ip_address: metadata?.ip_address,
                            external_id: visitor_id,
                            country: metadata?.country, 
                            st: metadata?.region,
                            ct: metadata?.city
                        },
                        {
                            content_name: metadata?.title || "Landing Page"
                        },
                        {
                            visitor_id: visitor_id
                        }
                    );
                } catch (e) {
                    console.error("[Track API] Erro no CAPI:", e);
                }
            })();
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
