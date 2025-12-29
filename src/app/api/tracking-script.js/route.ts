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
    // --- TeleTrack / TrackGram v4.0 (Direct Link Mode) ---
    // Modo sem /t/slug - gera link e substitui automaticamente
    
    // --- Branding Logs ---
    if (!window.__teletrack_branded) {
        window.__teletrack_branded = true;
        try {
            console.log("%c████████╗██████╗  █████╗  ██████╗██╗  ██╗ ██████╗ ██████╗  █████╗ ███╗   ███╗\\n╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝ ██╔══██╗██╔══██╗████╗ ████║\\n   ██║   ██████╔╝███████║██║     █████╔╝ ██║  ███╗██████╔╝███████║██╔████╔██║\\n   ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║\\n   ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║\\n   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝", "color: #8B5CF6; font-family: monospace; font-size: 10px;");
            console.log("%c🚀 TrackGram v4.0 - Direct Link Mode", "color: #8B5CF6; font-size: 14px; font-weight: bold; padding: 8px 0;");
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
    TELEGRAM_LINK_PATTERN: /https?:\\/\\/(t\\.me|telegram\\.me|telegram\\.dog)\\/([a-zA-Z0-9_]+|\\+[a-zA-Z0-9_\\-]+)/i
  };

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
  
  // Ads IDs (NOVO)
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

  // ==================== TRACKED INVITE LINK ====================
  let trackedInviteLink = null;
  let isAssigningLink = false;

  // ==================== LOADING UI ====================
  function showLoadingUI() {
    if (document.getElementById('trackgram-loading')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'trackgram-loading';
    overlay.innerHTML = \`
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        animation: tgFadeIn 0.3s ease-out;
      ">
        <!-- Spinner -->
        <div style="
          width: 70px;
          height: 70px;
          border: 4px solid rgba(139, 92, 246, 0.3);
          border-top: 4px solid #8B5CF6;
          border-radius: 50%;
          animation: tgSpin 0.8s linear infinite;
          margin-bottom: 28px;
        "></div>
        
        <!-- Texto Principal -->
        <div style="
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 12px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          animation: tgPulse 1.5s ease-in-out infinite;
        ">REDIRECIONANDO</div>
        
        <!-- Subtexto -->
        <div style="
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          margin-bottom: 24px;
        ">Gerando seu link exclusivo...</div>
        
        <!-- Link Manual -->
        <a 
          href="#" 
          id="trackgram-manual-link"
          style="
            color: rgba(255, 255, 255, 0.7);
            font-size: 13px;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            padding: 10px 20px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
          "
          onmouseover="this.style.color='#ffffff'; this.style.background='rgba(255, 255, 255, 0.2)';"
          onmouseout="this.style.color='rgba(255, 255, 255, 0.7)'; this.style.background='rgba(255, 255, 255, 0.1)';"
        >Não foi redirecionado? Clique aqui</a>
      </div>
    \`;

    const style = document.createElement('style');
    style.id = 'trackgram-loading-styles';
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
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    \`;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    // Configurar link manual
    setTimeout(() => {
      const manualLink = document.getElementById('trackgram-manual-link');
      if (manualLink && trackedInviteLink) {
        manualLink.href = trackedInviteLink;
        manualLink.onclick = function(e) {
          if (trackedInviteLink) {
            window.location.href = trackedInviteLink;
          }
        };
      }
    }, 100);
  }

  function hideLoadingUI() {
    const overlay = document.getElementById('trackgram-loading');
    if (overlay) overlay.remove();
    const style = document.getElementById('trackgram-loading-styles');
    if (style) style.remove();
  }

  function redirectToInvite(url) {
    hideLoadingUI();
    if (window.location.replace) {
      window.location.replace(url);
    } else {
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
      source: 'tracking_script_v4'
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

  // ==================== TELEGRAM LINK MANAGEMENT ====================
  function findTelegramLinks() {
    const allLinks = document.querySelectorAll('a[href]');
    const telegramLinks = [];
    
    allLinks.forEach(link => {
      if (CONFIG.TELEGRAM_LINK_PATTERN.test(link.href)) {
        telegramLinks.push(link);
      }
    });
    
    return telegramLinks;
  }

  async function fetchInviteLink() {
    if (!CONFIG.FUNNEL_ID) {
      console.warn('[TrackGram] ⚠️ funnel_id não configurado - links não serão substituídos');
      return null;
    }

    if (isAssigningLink) return trackedInviteLink;
    isAssigningLink = true;

    try {
      const response = await fetch(CONFIG.API_URL + '/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funnel_id: CONFIG.FUNNEL_ID,
          visitor_id: vid,
          metadata: getMetadata()
        })
      });

      const data = await response.json();

      if (data.invite_link) {
        trackedInviteLink = data.invite_link;
        console.log('%c[TrackGram] ✅ Link gerado com sucesso', 'color: #10B981; font-weight: bold');
        return trackedInviteLink;
      } else {
        console.error('[TrackGram] ❌ Erro ao gerar link:', data.error);
        return null;
      }
    } catch (error) {
      console.error('[TrackGram] ❌ Erro na requisição:', error);
      return null;
    } finally {
      isAssigningLink = false;
    }
  }

  async function replaceAllTelegramLinks() {
    const telegramLinks = findTelegramLinks();
    
    if (telegramLinks.length === 0) {
      console.log('[TrackGram] ℹ️ Nenhum link do Telegram encontrado na página');
      return;
    }

    console.log('[TrackGram] 🔍 Links do Telegram encontrados:', telegramLinks.length);

    // Buscar link se ainda não temos
    if (!trackedInviteLink) {
      await fetchInviteLink();
    }

    if (!trackedInviteLink) {
      console.warn('[TrackGram] ⚠️ Não foi possível gerar link - links originais mantidos');
      return;
    }

    // Substituir todos os links
    let replacedCount = 0;
    telegramLinks.forEach(link => {
      if (!link.hasAttribute('data-trackgram-replaced')) {
        link.setAttribute('data-trackgram-original', link.href);
        link.setAttribute('data-trackgram-replaced', 'true');
        link.href = trackedInviteLink;
        replacedCount++;
      }
    });

    console.log('%c[TrackGram] ✅ ' + replacedCount + ' links substituídos', 'color: #10B981; font-weight: bold');
  }

  // ==================== CLICK HANDLER ====================
  async function handleTelegramClick(event) {
    // SEMPRE prevenir navegação primeiro - decisão depois
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    const link = event.currentTarget || event.target.closest('a');
    if (!link) return;
    
    // Salvar href original se ainda não foi salvo
    if (!link.hasAttribute('data-trackgram-original')) {
      link.setAttribute('data-trackgram-original', link.href);
    }
    
    const originalHref = link.getAttribute('data-trackgram-original') || link.href;
    
    // Se já temos link trackado, redirecionar direto
    if (trackedInviteLink) {
      console.log('[TrackGram] 🚀 Redirecionando via link trackado');
      sendEvent('click', { button_type: 'telegram_link' });
      window.location.href = trackedInviteLink;
      return;
    }
    
    // Se não temos link trackado, mostrar loading e gerar
    console.log('[TrackGram] ⏳ Link ainda não substituído - gerando...');
    showLoadingUI();
    
    // Registrar click
    sendEvent('click', { button_type: 'telegram_link_pending' });

    // Tentar gerar link
    const inviteLink = await fetchInviteLink();
    
    if (inviteLink) {
      // Atualizar link manual no loading
      const manualLink = document.getElementById('trackgram-manual-link');
      if (manualLink) {
        manualLink.href = inviteLink;
        manualLink.onclick = function() {
          window.location.href = inviteLink;
        };
      }
      
      // Redirecionar após pequeno delay para mostrar o loading
      setTimeout(() => {
        redirectToInvite(inviteLink);
      }, 300);
    } else {
      // Fallback: usar link original (sem tracking)
      console.warn('[TrackGram] ⚠️ Falha ao gerar link - usando original');
      hideLoadingUI();
      window.location.href = originalHref;
    }
  }

  function setupClickHandlers() {
    const telegramLinks = findTelegramLinks();
    
    telegramLinks.forEach(link => {
      if (!link.hasAttribute('data-trackgram-handler')) {
        link.setAttribute('data-trackgram-handler', 'true');
        // Usar capture: true para garantir que nosso handler seja chamado primeiro
        link.addEventListener('click', handleTelegramClick, { capture: true });
      }
    });
  }

  // ==================== MUTATION OBSERVER (SPA Support) ====================
  function setupMutationObserver() {
    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      let hasNewLinks = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'A' && CONFIG.TELEGRAM_LINK_PATTERN.test(node.href)) {
              hasNewLinks = true;
            }
            if (node.querySelectorAll) {
              const links = node.querySelectorAll('a[href]');
              links.forEach(link => {
                if (CONFIG.TELEGRAM_LINK_PATTERN.test(link.href) && !link.hasAttribute('data-trackgram-replaced')) {
                  hasNewLinks = true;
                }
              });
            }
          }
        });
      });

      if (hasNewLinks && trackedInviteLink) {
        // Se já temos o link, substituir imediatamente
        const newLinks = findTelegramLinks().filter(link => !link.hasAttribute('data-trackgram-replaced'));
        if (newLinks.length > 0) {
          console.log('[TrackGram] 🔄 Novos links detectados:', newLinks.length);
          newLinks.forEach(link => {
            link.setAttribute('data-trackgram-original', link.href);
            link.setAttribute('data-trackgram-replaced', 'true');
            link.href = trackedInviteLink;
            link.setAttribute('data-trackgram-handler', 'true');
            link.addEventListener('click', handleTelegramClick);
          });
        }
      } else if (hasNewLinks) {
        // Se ainda não temos o link, configurar handlers
        setupClickHandlers();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ==================== LEGACY: Decorar links /t/ (Compatibilidade) ====================
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

        if (!url.searchParams.has('vid')) {
          url.searchParams.set('vid', vid);
        }
        if (fbc && !url.searchParams.has('fbc')) {
          url.searchParams.set('fbc', fbc);
        }
        if (fbp && !url.searchParams.has('fbp')) {
          url.searchParams.set('fbp', fbp);
        }

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

  // ==================== INICIALIZAÇÃO ====================
  async function init() {
    console.log('[TrackGram] 🚀 Inicializando v4.0 (Direct Link Mode)');
    console.log('[TrackGram] 📍 Visitor ID:', vid);
    
    // 1. Enviar PageView imediatamente
    sendEvent('pageview');

    // 2. Decorar links /t/ legados (compatibilidade)
    decorateLegacyLinks();

    // 3. Configurar click handlers para links do Telegram
    setupClickHandlers();

    // 4. Buscar e substituir links do Telegram (assíncrono)
    replaceAllTelegramLinks();

    // 5. Observar DOM para SPAs
    setupMutationObserver();

    // 6. Re-executar periodicamente (fallback para SPAs lentos)
    setInterval(() => {
      decorateLegacyLinks();
      if (!trackedInviteLink) {
        replaceAllTelegramLinks();
      }
    }, 3000);
  }

  // Aguardar DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
`;

  return new Response(scriptContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
