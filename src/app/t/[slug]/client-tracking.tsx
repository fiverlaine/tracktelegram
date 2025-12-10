"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface GeoData {
    city?: string;
    country?: string;
    region?: string;
}

interface ClientTrackingProps {
    slug: string;
    ip?: string;
    geo?: GeoData;
}

interface FacebookParams {
    fbclid: string | null;
    fbc: string | null;
    fbp: string | null;
}

export default function ClientTracking({ slug, ip, geo }: ClientTrackingProps) {
    const [loading, setLoading] = useState(true);
    const [funnel, setFunnel] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [visitorId, setVisitorId] = useState<string>("");
    const [fbParams, setFbParams] = useState<FacebookParams>({ fbclid: null, fbc: null, fbp: null });
    const [redirectStatus, setRedirectStatus] = useState<string>("Preparando seu acesso...");
    const supabase = createClient();

    useEffect(() => {
        async function init() {
            // 1. Generate/Get Visitor ID
            const vid = getOrCreateVisitorId();
            setVisitorId(vid);

            // 2. Capture Facebook Parameters
            const fb = captureFacebookParams();
            setFbParams(fb);

            // 3. Fetch Funnel Details
            const { data, error } = await supabase
                .from("funnels")
                .select(`
                    *,
                    pixels(*),
                    telegram_bots(
                        id,
                        name,
                        username,
                        channel_link,
                        bot_token,
                        chat_id
                    )
                `)
                .eq("slug", slug)
                .single();

            if (error || !data) {
                console.error("Erro ao buscar funil:", error);
                setError("Link inválido ou expirado.");
                setLoading(false);
                return;
            }

            // Debug: verificar dados do bot
            console.log("Funnel data:", {
                id: data.id,
                name: data.name,
                bot_id: data.bot_id,
                telegram_bots: data.telegram_bots
            });

            // Validar se o funil tem bot configurado
            if (!data.bot_id) {
                setError("Este funil não possui um canal configurado. Configure um canal na página de Funis.");
                setLoading(false);
                return;
            }

            if (!data.telegram_bots) {
                setError("Canal associado a este funil não foi encontrado. Verifique as configurações.");
                setLoading(false);
                return;
            }

            setFunnel(data);

            // 4. Track PageView (internal + prepare for CAPI)
            await trackPageView(data, vid, fb);
            setLoading(false);
        }

        init();
    }, [slug]);

    /**
     * Captura parâmetros do Facebook para atribuição
     */
    function captureFacebookParams(): FacebookParams {
        const urlParams = new URLSearchParams(window.location.search);

        let fbclid = urlParams.get("fbclid");
        let fbc = urlParams.get("fbc");
        let fbp = urlParams.get("fbp");

        // 1. Prioridade: Parâmetros explícitos na URL (vindos do script externo)
        if (fbc) {
            setCookie("_fbc", fbc, 90);
        } else {
            // 2. Fallback: Tentar ler do cookie
            fbc = getCookie("_fbc");
            // 3. Fallback: Gerar se tiver fbclid
            if (!fbc && fbclid) {
                fbc = `fb.1.${Date.now()}.${fbclid}`;
                setCookie("_fbc", fbc, 90);
            }
        }

        if (fbp) {
            setCookie("_fbp", fbp, 90);
        } else {
            fbp = getCookie("_fbp");
            if (!fbp) {
                fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 10000000000)}`;
                setCookie("_fbp", fbp, 90);
            }
        }

        return { fbclid, fbc, fbp };
    }

    /**
     * Gera ou recupera visitor_id único
     */
    function getOrCreateVisitorId(): string {
        const urlParams = new URLSearchParams(window.location.search);
        const urlVid = urlParams.get("vid");

        if (urlVid) {
            // Se veio da URL (script externo), usamos este como verdade absoluta
            localStorage.setItem("track_vid", urlVid);
            return urlVid;
        }

        let vid = localStorage.getItem("track_vid");
        if (!vid) {
            vid = crypto.randomUUID();
            localStorage.setItem("track_vid", vid);
        }
        return vid;
    }

    /**
     * Helper: Get Cookie
     */
    function getCookie(name: string): string | null {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop()?.split(";").shift() || null;
        }
        return null;
    }

    /**
     * Helper: Set Cookie
     */
    function setCookie(name: string, value: string, days: number) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        const domain = window.location.hostname.replace(/^www\./, "");
        document.cookie = `${name}=${value};${expires};path=/;domain=.${domain};SameSite=Lax`;
    }

    /**
     * Rastreia PageView interno e prepara dados para CAPI
     */
    async function trackPageView(funnelData: any, vid: string, fb: FacebookParams) {
        // Coletar dados do usuário para melhor Event Match Quality
        const userData = {
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            page_url: window.location.href,
            fbclid: fb.fbclid,
            fbc: fb.fbc,
            fbp: fb.fbp,
            // Capturar UTMs para análise
            utm_source: new URLSearchParams(window.location.search).get("utm_source"),
            utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
            utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
            utm_content: new URLSearchParams(window.location.search).get("utm_content"),
            utm_term: new URLSearchParams(window.location.search).get("utm_term"),
            ip_address: ip, // IP capturado via Server Component
            city: geo?.city,
            country: geo?.country,
            region: geo?.region,
        };

        // A. Internal Tracking - Salvar no Supabase
        await supabase.from("events").insert({
            funnel_id: funnelData.id,
            visitor_id: vid,
            event_type: "pageview",
            metadata: userData
        });

        // B. Facebook Browser Pixel (fallback client-side)
        if (funnelData.pixels?.pixel_id) {
            try {
                const ReactPixel = (await import("react-facebook-pixel")).default;
                ReactPixel.init(funnelData.pixels.pixel_id, undefined, {
                    autoConfig: true,
                    debug: false,
                });
                ReactPixel.pageView();
            } catch (e) {
                console.warn("Facebook Pixel não carregado:", e);
            }
        }
    }

    useEffect(() => {
        if (funnel && visitorId) {
            autoRedirect();
        }
    }, [funnel, visitorId]);

    /**
     * Redireciona automaticamente para o Canal (FLUXO DIRETO)
     * Gera um link de convite único e redireciona diretamente
     */
    async function autoRedirect() {
        if (!funnel || !visitorId) return;

        setRedirectStatus("Registrando acesso...");

        // Capturar UTMs da URL atual
        const urlParams = new URLSearchParams(window.location.search);

        // 1. Internal Click Track com dados completos (incluindo UTMs)
        const clickData = {
            timestamp: new Date().toISOString(),
            fbclid: fbParams.fbclid,
            fbc: fbParams.fbc,
            fbp: fbParams.fbp,
            user_agent: navigator.userAgent,
            page_url: window.location.href,
            // UTMs
            utm_source: urlParams.get("utm_source"),
            utm_medium: urlParams.get("utm_medium"),
            utm_campaign: urlParams.get("utm_campaign"),
            utm_content: urlParams.get("utm_content"),
            utm_term: urlParams.get("utm_term"),
            ip_address: ip, // IP capturado via Server Component
            city: geo?.city,
            country: geo?.country,
            region: geo?.region,
        };

        // Salvar evento de click (AGUARDAR para garantir que seja salvo antes do redirect)
        try {
            await supabase.from("events").insert({
                funnel_id: funnel.id,
                visitor_id: visitorId,
                event_type: "click",
                metadata: clickData
            });
            console.log("Click event salvo com sucesso");
        } catch (err) {
            console.error("Erro ao salvar click event:", err);
        }

        // 2. Facebook Event (client-side como backup) - REMOVIDO
        // O evento Lead será enviado via CAPI no webhook quando o usuário entrar no canal
        // Não disparamos eventos de pixel aqui para evitar duplicação

        setRedirectStatus("Gerando acesso exclusivo...");

        // 3. NOVO FLUXO: Gerar link de convite dinâmico e ir DIRETO para o canal
        try {
            const response = await fetch(
                `/api/invite?funnel_id=${funnel.id}&visitor_id=${visitorId}`
            );
            const data = await response.json();

            if (data.invite_link) {
                setRedirectStatus("Redirecionando para o canal...");
                
                // Log para debug
                console.log("Invite link gerado:", {
                    link: data.invite_link,
                    is_dynamic: data.is_dynamic
                });

                // Pequeno delay para garantir que o evento foi salvo
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Redireciona DIRETO para o canal (sem bot intermediário)
                window.location.href = data.invite_link;
                return;
            }
        } catch (error) {
            console.error("Erro ao gerar invite link:", error);
        }

        // 4. FALLBACK: Se falhar, usar link estático do canal
        const bot = funnel.telegram_bots;
        const channelLink = bot?.channel_link;

        if (channelLink) {
            setRedirectStatus("Redirecionando...");
            window.location.href = channelLink;
        } else {
            setError("Não foi possível gerar o link de acesso. Tente novamente.");
        }
    }

    if (error) {
        return (
            <div className="text-center space-y-4">
                <div className="text-red-500 font-bold text-lg">{error}</div>
                <p className="text-muted-foreground text-sm">
                    Verifique se o link está correto ou entre em contato com o anunciante.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen min-w-screen bg-white flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">{redirectStatus}</p>
            </div>
        );
    }

    // Tela de loading/redirect (White Page)
    return (
        <div className="min-h-screen min-w-screen bg-white flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">{redirectStatus}</p>
        </div>
    );
}
