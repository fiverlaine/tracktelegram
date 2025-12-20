"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// --- Tipos ---
type FunnelData = {
    id: string;
    name: string;
    slug: string;
    pixel_id?: string;
    pixels?: {
        pixel_id: string;
        access_token?: string;
    } | null;
    domain_id?: string;
    domains?: {
        domain: string;
    } | null;
};

interface ClientRedirectProps {
    slug: string;
    ip: string;
    geo: {
        city?: string;
        country?: string;
        region?: string;
        postal_code?: string;
    };
    initialFunnelData: FunnelData | null;
    searchParams: { [key: string]: string | string[] | undefined };
}

export default function ClientRedirect({
    slug,
    ip,
    geo,
    initialFunnelData,
    searchParams,
}: ClientRedirectProps) {
    const [status, setStatus] = useState("Carregando...");

    useEffect(() => {
        const processRedirect = async () => {
            try {
                setStatus("Iniciando redirecionamento seguro...");

                // 1. Identificar Visitor ID
                let vid = searchParams.vid as string;
                if (!vid) {
                    vid = localStorage.getItem("visitor_id") || uuidv4();
                    localStorage.setItem("visitor_id", vid);
                }

                // 2. Coletar Fingerprint
                const fingerprint = {
                    ua: navigator.userAgent,
                    sr: `${window.screen.width}x${window.screen.height}`,
                    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    lang: navigator.language,
                };

                // 3. Coletar UTMs e FB Params
                const fbc = searchParams.fbc as string || localStorage.getItem("_fbc");
                const fbp = searchParams.fbp as string || localStorage.getItem("_fbp");
                
                const utms = {
                    utm_source: searchParams.utm_source as string || localStorage.getItem("utm_source"),
                    utm_medium: searchParams.utm_medium as string || localStorage.getItem("utm_medium"),
                    utm_campaign: searchParams.utm_campaign as string || localStorage.getItem("utm_campaign"),
                    utm_content: searchParams.utm_content as string || localStorage.getItem("utm_content"),
                    utm_term: searchParams.utm_term as string || localStorage.getItem("utm_term"),
                };

                // 4. Salvar Evento PageView (Crucial para o Matching)
                if (initialFunnelData) {
                    setStatus("Registrando acesso...");
                    
                    try {
                        await fetch("/api/track", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                funnel_id: initialFunnelData.id,
                                visitor_id: vid,
                                event_type: "pageview", // Ou "redirect_click"
                                metadata: {
                                    ...utms,
                                    fbc,
                                    fbp,
                                    ip_address: ip,
                                    user_agent: fingerprint.ua,
                                    screen_resolution: fingerprint.sr,
                                    timezone: fingerprint.tz,
                                    language: fingerprint.lang,
                                    page_url: window.location.href,
                                    source: "redirect_page"
                                }
                            })
                        });
                    } catch (e) {
                        console.error("Erro ao salvar track:", e);
                    }
                }

                // 5. Construir URL de Destino (Betia)
                const targetBase = "https://betia.io/codigo/";
                const targetUrl = new URL(targetBase);
                
                // Adicionar Params
                targetUrl.searchParams.set("vid", vid);
                if (fbc) targetUrl.searchParams.set("fbc", fbc);
                if (fbp) targetUrl.searchParams.set("fbp", fbp);
                
                // Fingerprint Params (para o betia-tracker.js ler)
                targetUrl.searchParams.set("ua", fingerprint.ua);
                targetUrl.searchParams.set("sr", fingerprint.sr);
                targetUrl.searchParams.set("tz", fingerprint.tz);
                targetUrl.searchParams.set("lang", fingerprint.lang);

                // UTMs
                Object.entries(utms).forEach(([key, value]) => {
                    if (value) targetUrl.searchParams.set(key, value as string);
                });

                setStatus("Redirecionando para a Bet...");
                
                // 6. Redirecionar
                window.location.href = targetUrl.toString();

            } catch (error) {
                console.error("Erro no redirect:", error);
                // Fallback: Redirecionar mesmo com erro
                window.location.href = "https://betia.io/codigo/";
            }
        };

        processRedirect();
    }, [slug, ip, geo, initialFunnelData, searchParams]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p className="text-gray-400 text-sm">{status}</p>
        </div>
    );
}
