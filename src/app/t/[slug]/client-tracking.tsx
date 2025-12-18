"use client";

// ... imports
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface GeoData {
    city?: string;
    country?: string;
    region?: string;
    postal_code?: string;
}

interface ClientTrackingProps {
    slug: string;
    ip?: string;
    geo?: GeoData;
    initialFunnelData?: any;
    visitorId?: string;
    searchParams?: any;
}

interface FacebookParams {
    fbclid: string | null;
    fbc: string | null;
    fbp: string | null;
}

export default function ClientTracking({ slug, ip, geo, initialFunnelData, visitorId: serverVid, searchParams }: ClientTrackingProps) {
    const [loading, setLoading] = useState(true);
    const [funnel, setFunnel] = useState<any>(initialFunnelData || null);
    const [error, setError] = useState<string | null>(null);
    const [visitorId, setVisitorId] = useState<string>(serverVid || "");
    const [fbParams, setFbParams] = useState<FacebookParams>({ fbclid: null, fbc: null, fbp: null });
    const [redirectStatus, setRedirectStatus] = useState<string>("Iniciando redirecionamento...");
    const [manualLink, setManualLink] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        async function init() {
            try {
                // 1. Visitor ID (Server ou Local)
                let vid = serverVid;
                if (!vid) {
                    vid = getOrCreateVisitorId();
                }
                setVisitorId(vid);

                // 2. Facebook Params
                const fbp = getCookie("_fbp");
                const fbc = getCookie("_fbc") || (searchParams?.fbclid ? `fb.1.${Date.now()}.${searchParams.fbclid}` : null);
                setFbParams({
                    fbclid: searchParams?.fbclid || null,
                    fbc,
                    fbp
                });

                // 3. Funnel Data (Se não veio do server)
                let currentFunnel = funnel;
                if (!currentFunnel) {
                    setRedirectStatus("Carregando funil...");

                    // 1. Fetch Funnel Base
                    const { data: funnelData, error: funnelError } = await supabase
                        .from("funnels")
                        .select("*")
                        .eq("slug", slug)
                        .single();

                    if (funnelError || !funnelData) throw new Error("Funil não encontrado");

                    // 2. Manual Join for Relations
                    let pixelData = null;
                    let botData = null;

                    if (funnelData.pixel_id) {
                        const { data: p } = await supabase.from("pixels").select("*").eq("id", funnelData.pixel_id).single();
                        pixelData = p;
                    }

                    if (funnelData.bot_id) {
                        const { data: b } = await supabase.from("telegram_bots").select("*").eq("id", funnelData.bot_id).single();
                        botData = b;
                    }

                    currentFunnel = {
                        ...funnelData,
                        pixels: pixelData,
                        telegram_bots: botData
                    };
                    setFunnel(currentFunnel);
                }

                // 4. Disparar Pixel (Client-Side para garantir execução)
                if (currentFunnel.pixels?.facebook_pixel_id) {
                    initFacebookPixel(currentFunnel.pixels.facebook_pixel_id);
                    trackFacebookEvent("PageView");
                }

                // 5. Gerar Link e Redirecionar (Client-Side)
                setRedirectStatus("Gerando seu acesso exclusivo...");

                // Preparar metadados para o clique
                const clickMetadata = {
                    timestamp: new Date().toISOString(),
                    fbclid: searchParams?.fbclid || null,
                    fbc: fbc,
                    fbp: fbp,
                    user_agent: navigator.userAgent,
                    page_url: window.location.href,
                    utm_source: searchParams?.utm_source || null,
                    utm_medium: searchParams?.utm_medium || null,
                    utm_campaign: searchParams?.utm_campaign || null,
                    utm_content: searchParams?.utm_content || null,
                    utm_term: searchParams?.utm_term || null,
                    ip_address: ip,
                    city: geo?.city,
                    country: geo?.country,
                    region: geo?.region,
                    postal_code: geo?.postal_code
                };

                // Chamar API de Invite
                const response = await fetch("/api/invite", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        funnel_id: currentFunnel.id,
                        visitor_id: vid,
                        metadata: clickMetadata
                    })
                });

                const result = await response.json();

                if (result.invite_link) {
                    setRedirectStatus("Redirecionando para o Telegram...");
                    setManualLink(result.invite_link);

                    // Pequeno delay para o usuário ver a animação (UX)
                    setTimeout(() => {
                        window.location.href = result.invite_link;
                    }, 500);
                } else {
                    throw new Error(result.error || "Erro ao gerar link");
                }

            } catch (err: any) {
                console.error("Erro no fluxo:", err);
                setError(err.message || "Erro desconhecido");
                setLoading(false);
            }
        }

        init();
    }, [slug, serverVid]); // Executa uma vez (ou se slug/vid mudar)

    // Helpers
    function getOrCreateVisitorId() {
        let vid = localStorage.getItem("visitor_id");
        if (!vid) {
            vid = crypto.randomUUID();
            localStorage.setItem("visitor_id", vid);
        }
        return vid;
    }

    function getCookie(name: string) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
        return null;
    }

    function initFacebookPixel(pixelId: string) {
        if (typeof window !== 'undefined' && !(window as any).fbq) {
            const n: any = function () {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
            };
            if (!(window as any)._fbq) (window as any)._fbq = n;
            n.push = n;
            n.loaded = true;
            n.version = '2.0';
            n.queue = [];
            const t = document.createElement('script');
            t.async = true;
            t.src = 'https://connect.facebook.net/en_US/fbevents.js';
            const s = document.getElementsByTagName('script')[0];
            s.parentNode?.insertBefore(t, s);
        }
        (window as any).fbq('init', pixelId);
    }

    function trackFacebookEvent(eventName: string, params?: any) {
        if ((window as any).fbq) {
            (window as any).fbq('track', eventName, params);
        }
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
                <div className="text-red-500 mb-4">⚠️ Erro ao processar solicitação</div>
                <div className="text-sm text-gray-400">{error}</div>
            </div>
        );
    }

    // UI "Redirecionando" (Estilo Concorrente)
    return (
        <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md font-sans animate-in fade-in duration-300">
            {/* Spinner Grande */}
            <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mb-8"></div>

            {/* Texto Principal */}
            <div className="text-white text-2xl font-bold tracking-[3px] uppercase mb-6 drop-shadow-lg animate-pulse">
                REDIRECIONANDO
            </div>

            {/* Link Manual */}
            {manualLink && (
                <a
                    href={manualLink}
                    className="text-white/70 text-sm no-underline px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 hover:text-white transition-all duration-200 cursor-pointer"
                >
                    Não foi redirecionado? Clique aqui
                </a>
            )}

            {/* Status discreto para debug/feedback */}
            <div className="absolute bottom-10 text-white/30 text-xs">
                {redirectStatus}
            </div>
        </div>
    );
}
