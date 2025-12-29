import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id"); // domain_id
  const funnelSlug = searchParams.get("funnel"); // funnel slug direto
  let pixelCode = "";
  let funnelId = "";
  let forcedSlug = "";

  // Se tiver ID de domínio, buscar configurações
  if (id) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Buscar domínio e pixels associados (Multi-Pixel)
      const { data: domain } = await supabase
        .from("domains")
        .select(`
                    id,
                    funnel_id,
                    funnels ( id, slug ),
                    pixels:pixels!domains_pixel_id_fkey (pixel_id),
                    domain_pixels (
                        pixels (pixel_id)
                    )
                `)
        .eq("id", id)
        .single();

      // Collect Pixel IDs
      const pixelIds = new Set<string>();

      // Legacy/Primary
      const legacyPixel = domain?.pixels as any;
      if (legacyPixel?.pixel_id) {
        pixelIds.add(legacyPixel.pixel_id);
      }

      // Multi-pixels
      if (domain?.domain_pixels && Array.isArray(domain.domain_pixels)) {
        domain.domain_pixels.forEach((dp: any) => {
          if (dp.pixels?.pixel_id) {
            pixelIds.add(dp.pixels.pixel_id);
          }
        });
      }

      forcedSlug = (domain as any)?.funnels?.slug || "";
      funnelId = (domain as any)?.funnels?.id || "";

      // Se tiver pixels, injetar código
      if (pixelIds.size > 0) {
        const initCodes = Array.from(pixelIds)
          .map(pid => `fbq('init', '${pid}');`)
          .join('\n');

        pixelCode = `
// --- Auto-Injected Facebook Pixel ---
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
${initCodes}
if (!sessionStorage.getItem('fb_pv_fired')) {
  fbq('track', 'PageView');
  sessionStorage.setItem('fb_pv_fired', 'true');
}
// ------------------------------------
`;
      }
    } catch (err) {
      console.error("Erro ao buscar domínio:", err);
    }
  }

  // Se tiver funnel slug direto, buscar o funnel_id
  if (funnelSlug && !funnelId) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: funnel } = await supabase
        .from("funnels")
        .select("id")
        .eq("slug", funnelSlug)
        .single();

      if (funnel?.id) {
        funnelId = funnel.id;
      }
    } catch (err) {
      console.error("Erro ao buscar funil por slug:", err);
    }
  }

  const apiOrigin = new URL(request.url).origin;

  const scriptContent = `
(function() {
    'use strict';
    
    // ==================== PREVENT MULTIPLE LOADS ====================
    if (window.__trackgram_v4_loaded) return;
    window.__trackgram_v4_loaded = true;

    // --- Branding Logs ---
    if (!window.__teletrack_branded) {
        window.__teletrack_branded = true;
        try {
            console.log("%c████████╗██████╗  █████╗  ██████╗██╗  ██╗ ██████╗ ██████╗  █████╗ ███╗   ███╗\\n╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝ ██╔══██╗██╔══██╗████╗ ████║\\n   ██║   ██████╔╝███████║██║     █████╔╝ ██║  ███╗██████╔╝███████║██╔████╔██║\\n   ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║\\n   ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║\\n   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝", "color: #8B5CF6; font-family: monospace; font-size: 10px;");
            console.log("%c🚀 TrackGram v4.1 - Direct Link Mode (Instant Intercept)", "color: #8B5CF6; font-size: 14px; font-weight: bold; padding: 8px 0;");
            console.log("%c📊 Atribuição avançada para Telegram + Facebook CAPI", "color: #6B7280; font-size: 12px;");
            console.log("%c─────────────────────────────────────────────────────", "color: #E5E7EB;");
        } catch (e) {}
    }

  ${pixelCode}

  // ==================== CONFIGURAÇÃO ====================
  const CONFIG = {
    API_URL: "${apiOrigin}/api",
    DOMAIN_ID: "${id || ''}",
    FUNNEL_ID: "${funnelId || ''}",
    FORCED_SLUG: "${forcedSlug}",
    TELEGRAM_LINK_PATTERN: /^https?:\\/\\/(t\\.me|telegram\\.me|telegram\\.dog)\\//i
  };

  // ==================== STATE ====================
  let trackedInviteLink = null;
  let isLinkReady = false;
  let linkPromise = null;
  let pendingRedirect = false;

  // ==================== HELPERS ====================
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getCookie(name) {
    var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
  }

  function setCookie(name, value, days) {
    var d = new Date;
    d.setTime(d.getTime() + 24*60*60*1000*days);
    const domain = window.location.hostname.replace(/^www\\./, "");
    document.cookie = name + "=" + value + ";path=/;expires=" + d.toGMTString() + ";domain=." + domain + ";SameSite=Lax";
  }

  function getUrlParam(name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  function isTelegramLink(href) {
    if (!href) return false;
    return CONFIG.TELEGRAM_LINK_PATTERN.test(href);
  }

  // ==================== VISITOR ID ====================
  let vid = localStorage.getItem('visitor_id');
  let urlVid = getUrlParam('vid');
  
  if (urlVid) {
    vid = urlVid;
    localStorage.setItem('visitor_id', vid);
  } else if (!vid) {
    vid = generateUUID();
    localStorage.setItem('visitor_id', vid);
  }
  
  console.log('[TrackGram] 🆔 Visitor ID:', vid);

  // ==================== FACEBOOK PARAMETERS ====================
  const fbclid = getUrlParam('fbclid');
  const fbcParam = getUrlParam('fbc');
  const fbpParam = getUrlParam('fbp');
  
  let fbc = getCookie('_fbc');
  if (fbcParam) {
     fbc = fbcParam;
     setCookie('_fbc', fbc, 90);
  } else if (fbclid && !fbc) {
    fbc = 'fb.1.' + Date.now() + '.' + fbclid;
    setCookie('_fbc', fbc, 90);
  }
  
  let fbp = getCookie('_fbp');
  if (fbpParam) {
      fbp = fbpParam;
      setCookie('_fbp', fbp, 90);
  } else if (!fbp) {
    fbp = 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 10000000000);
    setCookie('_fbp', fbp, 90);
  }

  // ==================== UTM PARAMETERS ====================
  const utmSource = getUrlParam('utm_source');
  const utmMedium = getUrlParam('utm_medium');
  const utmCampaign = getUrlParam('utm_campaign');
  const utmContent = getUrlParam('utm_content');
  const utmTerm = getUrlParam('utm_term');
  const campaignId = getUrlParam('campaign_id') || getUrlParam('campaignid');
  const adsetId = getUrlParam('adset_id') || getUrlParam('adsetid');
  const adId = getUrlParam('ad_id') || getUrlParam('adid');

  // Salvar UTMs no localStorage
  if (utmSource) localStorage.setItem('track_utm_source', utmSource);
  if (utmMedium) localStorage.setItem('track_utm_medium', utmMedium);
  if (utmCampaign) localStorage.setItem('track_utm_campaign', utmCampaign);
  if (utmContent) localStorage.setItem('track_utm_content', utmContent);
  if (utmTerm) localStorage.setItem('track_utm_term', utmTerm);
  if (campaignId) localStorage.setItem('track_campaign_id', campaignId);
  if (adsetId) localStorage.setItem('track_adset_id', adsetId);
  if (adId) localStorage.setItem('track_ad_id', adId);

  // ==================== LOADING UI ====================
  function injectStyles() {
    if (document.getElementById('trackgram-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'trackgram-styles';
    style.textContent = \`
      @keyframes tgFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes tgSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes tgPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(0.98); }
      }
      @keyframes tgBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      #trackgram-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.85) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        animation: tgFadeIn 0.2s ease-out !important;
      }
      #trackgram-overlay * {
        box-sizing: border-box !important;
      }
      .tg-spinner {
        width: 60px !important;
        height: 60px !important;
        border: 4px solid rgba(139, 92, 246, 0.3) !important;
        border-top: 4px solid #8B5CF6 !important;
        border-radius: 50% !important;
        animation: tgSpin 0.7s linear infinite !important;
        margin-bottom: 24px !important;
      }
      .tg-text {
        color: #ffffff !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        letter-spacing: 2px !important;
        text-transform: uppercase !important;
        margin-bottom: 8px !important;
        animation: tgPulse 1.5s ease-in-out infinite !important;
      }
      .tg-subtext {
        color: rgba(255, 255, 255, 0.6) !important;
        font-size: 14px !important;
        margin-bottom: 24px !important;
      }
      .tg-manual-btn {
        color: rgba(255, 255, 255, 0.8) !important;
        font-size: 13px !important;
        text-decoration: none !important;
        padding: 12px 24px !important;
        border-radius: 8px !important;
        background: rgba(139, 92, 246, 0.3) !important;
        border: 1px solid rgba(139, 92, 246, 0.5) !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        display: none !important;
      }
      .tg-manual-btn.visible {
        display: block !important;
        animation: tgBounce 2s ease-in-out infinite !important;
      }
      .tg-manual-btn:hover {
        background: rgba(139, 92, 246, 0.5) !important;
        color: #ffffff !important;
      }
    \`;
    document.head.appendChild(style);
  }

  function showLoadingOverlay() {
    if (document.getElementById('trackgram-overlay')) return;
    
    injectStyles();
    
    const overlay = document.createElement('div');
    overlay.id = 'trackgram-overlay';
    overlay.innerHTML = \`
      <div class="tg-spinner"></div>
      <div class="tg-text">REDIRECIONANDO</div>
      <a href="#" class="tg-manual-btn" id="tg-manual-btn">Clique aqui se não redirecionar</a>
    \`;
    
    document.body.appendChild(overlay);
    
    // Mostrar botão manual após 3 segundos
    setTimeout(() => {
      const btn = document.getElementById('tg-manual-btn');
      if (btn) {
        btn.classList.add('visible');
        if (trackedInviteLink) {
          btn.href = trackedInviteLink;
          btn.onclick = function(e) {
            e.preventDefault();
            redirectTo(trackedInviteLink);
          };
        }
      }
    }, 3000);
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('trackgram-overlay');
    if (overlay) overlay.remove();
  }

  function redirectTo(url) {
    console.log('[TrackGram] 🚀 Redirecionando para:', url);
    hideLoadingOverlay();
    
    // Múltiplos métodos para garantir redirecionamento
    try {
      window.location.replace(url);
    } catch(e) {
      window.location.href = url;
    }
  }

  // ==================== TRACKING API ====================
  function getMetadata() {
    return {
      page_url: window.location.href,
      title: document.title,
      user_agent: navigator.userAgent,
      fbc: fbc,
      fbp: fbp,
      fbclid: fbclid,
      utm_source: utmSource || localStorage.getItem('track_utm_source'),
      utm_medium: utmMedium || localStorage.getItem('track_utm_medium'),
      utm_campaign: utmCampaign || localStorage.getItem('track_utm_campaign'),
      utm_content: utmContent || localStorage.getItem('track_utm_content'),
      utm_term: utmTerm || localStorage.getItem('track_utm_term'),
      campaign_id: campaignId || localStorage.getItem('track_campaign_id'),
      adset_id: adsetId || localStorage.getItem('track_adset_id'),
      ad_id: adId || localStorage.getItem('track_ad_id'),
      source: 'tracking_script_v4.1'
    };
  }

  function sendEvent(eventType, extraMetadata = {}) {
    const payload = {
      visitor_id: vid,
      event_type: eventType,
      funnel_id: CONFIG.FUNNEL_ID || null,
      domain_id: CONFIG.DOMAIN_ID || null,
      metadata: {
        ...getMetadata(),
        ...extraMetadata
      }
    };

    fetch(CONFIG.API_URL + '/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(err => console.error('[TrackGram] Erro ao enviar evento:', err));
  }

  // ==================== INVITE LINK GENERATION ====================
  function fetchInviteLink() {
    // Se já tem promise em andamento, retorna ela
    if (linkPromise) return linkPromise;
    
    if (!CONFIG.FUNNEL_ID) {
      console.warn('[TrackGram] ⚠️ funnel_id não configurado');
      return Promise.resolve(null);
    }

    console.log('[TrackGram] 📡 Buscando link único...');

    linkPromise = fetch(CONFIG.API_URL + '/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        funnel_id: CONFIG.FUNNEL_ID,
        visitor_id: vid,
        metadata: getMetadata()
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.invite_link) {
        trackedInviteLink = data.invite_link;
        isLinkReady = true;
        console.log('%c[TrackGram] ✅ Link gerado: ' + trackedInviteLink, 'color: #10B981; font-weight: bold');
        
        // Atualizar todos os links que foram marcados
        updateAllTelegramLinks();
        
        // Se há redirect pendente, executar
        if (pendingRedirect) {
          pendingRedirect = false;
          redirectTo(trackedInviteLink);
        }
        
        return trackedInviteLink;
      } else {
        console.error('[TrackGram] ❌ Erro:', data.error);
        return null;
      }
    })
    .catch(err => {
      console.error('[TrackGram] ❌ Erro na requisição:', err);
      return null;
    });

    return linkPromise;
  }

  // ==================== TELEGRAM LINK MANAGEMENT ====================
  function findAllTelegramLinks() {
    const links = document.querySelectorAll('a[href]');
    const telegramLinks = [];
    
    links.forEach(link => {
      if (isTelegramLink(link.getAttribute('href'))) {
        telegramLinks.push(link);
      }
    });
    
    return telegramLinks;
  }

  function markAndProtectLinks() {
    const links = findAllTelegramLinks();
    
    if (links.length === 0) {
      console.log('[TrackGram] ℹ️ Nenhum link do Telegram encontrado');
      return;
    }

    console.log('[TrackGram] 🔍 Links do Telegram encontrados:', links.length);

    links.forEach((link, index) => {
      if (link.hasAttribute('data-tg-protected')) return;
      
      // Salvar href original
      const originalHref = link.getAttribute('href');
      link.setAttribute('data-tg-original', originalHref);
      link.setAttribute('data-tg-protected', 'true');
      link.setAttribute('data-tg-index', index.toString());
      
      // IMPORTANTE: Não mudar o href ainda, o click handler vai interceptar
      console.log('[TrackGram] 🔒 Link protegido:', originalHref);
    });

    // Iniciar busca do link se ainda não iniciou
    if (!linkPromise && CONFIG.FUNNEL_ID) {
      fetchInviteLink();
    }
  }

  function updateAllTelegramLinks() {
    if (!trackedInviteLink) return;
    
    const links = document.querySelectorAll('a[data-tg-protected="true"]');
    let count = 0;
    
    links.forEach(link => {
      if (!link.hasAttribute('data-tg-replaced')) {
        link.setAttribute('href', trackedInviteLink);
        link.setAttribute('data-tg-replaced', 'true');
        count++;
      }
    });
    
    if (count > 0) {
      console.log('%c[TrackGram] ✅ ' + count + ' links atualizados com link trackado', 'color: #10B981; font-weight: bold');
    }
  }

  // ==================== CLICK INTERCEPTOR ====================
  // Usando capture: true para interceptar ANTES de qualquer outro handler
  function setupGlobalClickInterceptor() {
    document.addEventListener('click', function(event) {
      // Encontrar o link clicado (pode ser o target ou um ancestor)
      let link = event.target;
      while (link && link.tagName !== 'A') {
        link = link.parentElement;
      }
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      
      // Verificar se é link do Telegram
      if (!isTelegramLink(href) && !link.hasAttribute('data-tg-protected')) {
        return;
      }
      
      // SEMPRE interceptar o click
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      console.log('[TrackGram] 🖱️ Click interceptado');
      
      // Registrar click
      sendEvent('click', { 
        button_type: 'telegram_link',
        original_href: link.getAttribute('data-tg-original') || href
      });
      
      // Se link já está pronto, redirecionar imediatamente
      if (isLinkReady && trackedInviteLink) {
        console.log('[TrackGram] ⚡ Link pronto - redirecionando imediatamente');
        redirectTo(trackedInviteLink);
        return;
      }
      
      // Link não está pronto - mostrar loading e aguardar
      console.log('[TrackGram] ⏳ Aguardando link...');
      showLoadingOverlay();
      pendingRedirect = true;
      
      // Garantir que a busca está em andamento
      if (!linkPromise) {
        fetchInviteLink();
      }
      
      // Fallback: se demorar muito, usar link original
      setTimeout(() => {
        if (pendingRedirect && !isLinkReady) {
          console.warn('[TrackGram] ⚠️ Timeout - usando link original');
          const originalHref = link.getAttribute('data-tg-original') || href;
          pendingRedirect = false;
          redirectTo(originalHref);
        }
      }, 10000); // 10 segundos de timeout
      
    }, true); // IMPORTANTE: capture: true
  }

  // ==================== MUTATION OBSERVER ====================
  function setupMutationObserver() {
    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      let hasNewLinks = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'A' && isTelegramLink(node.getAttribute('href'))) {
              hasNewLinks = true;
            }
            if (node.querySelectorAll) {
              const links = node.querySelectorAll('a[href]');
              links.forEach(link => {
                if (isTelegramLink(link.getAttribute('href')) && !link.hasAttribute('data-tg-protected')) {
                  hasNewLinks = true;
                }
              });
            }
          }
        });
      });

      if (hasNewLinks) {
        console.log('[TrackGram] 🔄 Novos links detectados');
        markAndProtectLinks();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ==================== LEGACY: Links /t/ ====================
  function decorateLegacyLinks() {
    var links = document.getElementsByTagName('a');
    
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (href && (href.includes('/t/') || href.includes('tracktelegram.vercel.app'))) {
        var url;
        try {
          url = new URL(href, window.location.origin);
        } catch (e) {
          continue;
        }

        if (!url.searchParams.has('vid')) url.searchParams.set('vid', vid);
        if (fbc && !url.searchParams.has('fbc')) url.searchParams.set('fbc', fbc);
        if (fbp && !url.searchParams.has('fbp')) url.searchParams.set('fbp', fbp);

        var utms = {
          'utm_source': utmSource || localStorage.getItem('track_utm_source'),
          'utm_medium': utmMedium || localStorage.getItem('track_utm_medium'),
          'utm_campaign': utmCampaign || localStorage.getItem('track_utm_campaign'),
          'utm_content': utmContent || localStorage.getItem('track_utm_content'),
          'utm_term': utmTerm || localStorage.getItem('track_utm_term')
        };

        for (var key in utms) {
          if (utms[key] && !url.searchParams.has(key)) {
            url.searchParams.set(key, utms[key]);
          }
        }

        if (CONFIG.FORCED_SLUG && url.pathname.includes('/t/')) {
          const pathParts = url.pathname.split('/t/');
          if (pathParts.length > 1) {
            url.pathname = '/t/' + CONFIG.FORCED_SLUG;
          }
        }

        if (links[i].getAttribute('href') !== url.toString()) {
          links[i].setAttribute('href', url.toString());
        }
      }
    }
  }

  // ==================== INITIALIZATION ====================
  function init() {
    console.log('[TrackGram] 🚀 Inicializando v4.1 (Instant Intercept)');
    
    // 1. Injetar estilos
    injectStyles();
    
    // 2. Configurar interceptador global de clicks (ANTES de qualquer coisa)
    setupGlobalClickInterceptor();
    
    // 3. Enviar PageView
    sendEvent('pageview');
    
    // 4. Decorar links legados /t/
    decorateLegacyLinks();
    
    // 5. Marcar e proteger links do Telegram
    markAndProtectLinks();
    
    // 6. Iniciar busca do link em background
    if (CONFIG.FUNNEL_ID) {
      fetchInviteLink();
    }
    
    // 7. Observar DOM para SPAs
    setupMutationObserver();
    
    // 8. Re-executar periodicamente
    setInterval(() => {
      decorateLegacyLinks();
      markAndProtectLinks();
    }, 2000);
  }

  // Aguardar DOM ready ou executar imediatamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM já carregou - executar imediatamente
    init();
  }

  // Também executar no load como backup
  window.addEventListener('load', function() {
    markAndProtectLinks();
    if (CONFIG.FUNNEL_ID && !linkPromise) {
      fetchInviteLink();
    }
  });

})();
`;

  return new Response(scriptContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
