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
        const { visitor_id, event_type, metadata, domain_id, funnel_id } = body;

        if (!visitor_id || !event_type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // --- FILTRO DE TRÁFEGO PAGO ---
        const hasAdOrigin = metadata?.fbclid || metadata?.fbc;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Buscar Pixels vinculados ao dominio ou funil (Multi-Pixel Support)
        let pixelsToFire: any[] = [];
        let finalFunnelId: string | null = funnel_id || null;

        // Deduplicação: Verificar se já existe evento idêntico recente (5 min)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        let query = supabase
            .from("events")
            .select("id")
            .eq("visitor_id", visitor_id)
            .eq("event_type", event_type)
            .gte("created_at", fiveMinutesAgo);

        if (finalFunnelId) {
            query = query.eq("funnel_id", finalFunnelId);
        } else if (domain_id) {
            query = query.eq("metadata->>domain_id", domain_id);
        }

        const { data: recentEvents } = await query.limit(1);

        if (recentEvents && recentEvents.length > 0) {
            // Evento duplicado recente, não gravar
            return NextResponse.json({ success: true, skipped: true }, {
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }

        if (domain_id) {
            const { data: domain } = await supabase
                .from("domains")
                .select(`
                    funnel_id,
                    pixels:pixels!domains_pixel_id_fkey (
                        id,
                        pixel_id,
                        access_token
                    ),
                    domain_pixels (
                        pixels (
                            id,
                            pixel_id,
                            access_token
                        )
                    )
                `)
                .eq("id", domain_id)
                .single();

            if (domain) {
                // 0. Set Funnel ID if available
                if (domain.funnel_id) {
                    finalFunnelId = domain.funnel_id;
                }

                // 1. Legacy/Primary Pixel
                if (domain.pixels) {
                    const legacyPixel = Array.isArray(domain.pixels) ? domain.pixels[0] : domain.pixels;
                    if (legacyPixel) pixelsToFire.push(legacyPixel);
                }

                // 2. Multi-pixels from join table
                if (domain.domain_pixels && Array.isArray(domain.domain_pixels)) {
                    domain.domain_pixels.forEach((dp: any) => {
                        if (dp.pixels) {
                            pixelsToFire.push(dp.pixels);
                        }
                    });
                }
            }
        }

        // Deduplicate pixels by pixel_id
        const uniquePixels = Array.from(new Map(pixelsToFire.map(p => [p.pixel_id, p])).values());

        // Inserir evento
        const { error } = await supabase.from("events").insert({
            visitor_id,
            event_type,
            funnel_id: finalFunnelId, // Agora usamos o ID do funil associado ao domínio ou passado no body
            metadata: {
                ...metadata,
                domain_id,
                source: metadata?.source || "external_script"
            }
        });

        if (error) {
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        // 2. Disparar CAPI (PageView) para TODOS os pixels encontrados
        // IMPORTANTE: Só disparar CAPI se tiver origem de anúncio (hasAdOrigin)
        if (event_type === 'pageview' && uniquePixels.length > 0 && hasAdOrigin) {
            // Aguarda o envio para garantir que a Vercel/Serverless não mate o processo antes de terminar
            const capiPromises = uniquePixels.map(pixelData => {
                if (!pixelData.access_token || !pixelData.pixel_id) return Promise.resolve();

                return sendCAPIEvent(
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
                        ct: metadata?.city,
                        zp: metadata?.postal_code // Fix: Mapeando CEP
                    },
                    {
                        content_name: metadata?.title || "Landing Page"
                    },
                    {
                        visitor_id: visitor_id
                    }
                ).catch(e => console.error(`[Track API] Erro CAPI (Pixel ${pixelData.pixel_id}):`, e));
            });

            // Usamos allSettled para que um erro em um pixel não trave os outros
            await Promise.allSettled(capiPromises);
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
