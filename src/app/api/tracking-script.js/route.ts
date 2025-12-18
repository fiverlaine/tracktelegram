import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  let pixelCode = "";
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
                    funnels ( slug ),
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

  const scriptContent = `
(function() {
    // --- TeleTrack Branding Logs (Estilo Concorrente) ---
    if (!window.__teletrack_branded) {
        window.__teletrack_branded = true;
        try {
            console.log("%c████████╗██████╗  █████╗  ██████╗██╗  ██╗███████╗ █████╗ ████████╗██╗  ██╗███████╗██████╗ \\n╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗╚══██╔══╝██║  ██║██╔════╝██╔══██╗\\n   ██║   ██████╔╝███████║██║     █████╔╝ █████╗  ███████║   ██║   ███████║█████╗  ██████╔╝\\n   ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██║   ██║   ██╔══██║██╔══╝  ██╔══██╗\\n   ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗██║     ██║  ██║   ██║   ██║  ██║███████╗██║  ██║\\n   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝", "color: #4F46E5; font-family: monospace; font-size: 10px;");
            console.log("%c🚀 Este site usa TeleTrack - Marketing Attribution & Analytics", "color: #4F46E5; font-size: 14px; font-weight: bold; padding: 8px 0;");
            console.log("%c📊 Plataforma completa de atribuição de marketing para Telegram", "color: #6B7280; font-size: 12px;");
            console.log("%c🔗 Conheça mais em: https://teletrack.vercel.app", "color: #10B981; font-size: 12px; font-weight: bold;");
            console.log("%c─────────────────────────────────────────────────────", "color: #E5E7EB;");
        } catch (e) {}
    }

  ${pixelCode}

  const FORCED_SLUG = "${forcedSlug}";

  // 1. Helper Functions
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

  // 2. Identify / Create Visitor
  let vid = localStorage.getItem('track_vid');
  let urlVid = getUrlParam('vid');
  
  // Prioridade: URL > LocalStorage
  if (urlVid) {
    vid = urlVid;
    localStorage.setItem('track_vid', vid);
  } else if (!vid) {
    vid = generateUUID();
    localStorage.setItem('track_vid', vid);
  }

  // 3. Facebook Parameters (FBC & FBP)
  const fbclid = getUrlParam('fbclid');
  const fbcParam = getUrlParam('fbc');
  const fbpParam = getUrlParam('fbp');
  
  // FBC - Click ID
  let fbc = getCookie('_fbc');
  if (fbcParam) {
     fbc = fbcParam;
     setCookie('_fbc', fbc, 90);
  } else if (fbclid && !fbc) {
    fbc = 'fb.1.' + Date.now() + '.' + fbclid;
    setCookie('_fbc', fbc, 90);
  }
  
  // FBP - Browser ID
  let fbp = getCookie('_fbp');
  if (fbpParam) {
      fbp = fbpParam;
      setCookie('_fbp', fbp, 90);
  } else if (!fbp) {
    fbp = 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 10000000000);
    setCookie('_fbp', fbp, 90);
  }

  // 4. Capturar UTMs da URL atual
  const utmSource = getUrlParam('utm_source');
  const utmMedium = getUrlParam('utm_medium');
  const utmCampaign = getUrlParam('utm_campaign');
  const utmContent = getUrlParam('utm_content');
  const utmTerm = getUrlParam('utm_term');

  // Salvar UTMs no localStorage para uso posterior
  if (utmSource) localStorage.setItem('track_utm_source', utmSource);
  if (utmMedium) localStorage.setItem('track_utm_medium', utmMedium);
  if (utmCampaign) localStorage.setItem('track_utm_campaign', utmCampaign);
  if (utmContent) localStorage.setItem('track_utm_content', utmContent);
  if (utmTerm) localStorage.setItem('track_utm_term', utmTerm);

  // 5. Link Decoration - Decorar links que apontam para /t/
  function decorateLinks() {
    var links = document.getElementsByTagName('a');
    
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      // Detectar links para o seu dominio de rastreamento (/t/)
      if (href && (href.includes('/t/') || href.includes('tracktelegram.vercel.app'))) {
        var url;
        try {
          // Tentar criar URL absoluta
          url = new URL(href, window.location.origin);
        } catch (e) {
          continue;
        }

        // Adicionar visitor_id
        if (!url.searchParams.has('vid')) {
          url.searchParams.set('vid', vid);
        }

        // Adicionar FBC/FBP
        if (fbc && !url.searchParams.has('fbc')) {
          url.searchParams.set('fbc', fbc);
        }
        if (fbp && !url.searchParams.has('fbp')) {
          url.searchParams.set('fbp', fbp);
        }

        // Adicionar UTMs (da URL atual ou do localStorage)
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

        // FORCE FUNNEL SLUG (Se configurado no domínio)
        if (FORCED_SLUG && url.pathname.includes('/t/')) {
             // Substituir qualquer slug pelo slug forçado
             // Ex: /t/funnel-antigo -> /t/funnel-novo
             const pathParts = url.pathname.split('/t/');
             if (pathParts.length > 1) {
                 url.pathname = '/t/' + FORCED_SLUG;
             }
        }

        // Update href se houver mudanças
        if (links[i].getAttribute('href') !== url.toString()) {
            links[i].setAttribute('href', url.toString());
        }
      }
    }
  }

  // --- NEW: Internal Tracking (Supabase) ---
  const API_URL = "${new URL(request.url).origin}/api/track";
  const DOMAIN_ID = "${id || ''}";

  function sendEvent(eventType, extraMetadata = {}) {
    const payload = {
      visitor_id: vid,
      event_type: eventType,
      domain_id: DOMAIN_ID,
      metadata: {
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
        ...extraMetadata
      }
    };

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true // Garante envio mesmo se navegar
    }).catch(err => {});
  }

  // 1. Track PageView immediately
  sendEvent('pageview');

  // 2. Track Clicks on Buttons
  document.addEventListener('click', function(e) {
    const target = e.target.closest('button');
    if (target) {
        sendEvent('click', {
            tag: 'button',
            button_text: target.innerText || target.textContent,
            classes: target.className
        });
    }
    
    // Also track links that are NOT redirects (optional, or requested?)
    // User requested "quando algum botao da pagina é clicado". 
    // We stick to buttons for now to be specific, or maybe elements with role='button'?
    // Let's stick to <button> tag for now as requested.
  });

  // ------------------------------------------

  // Run on load and periodically (for SPAs)
  decorateLinks();
  setInterval(decorateLinks, 2000);

  // Also run on DOM changes
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function(mutations) {
      decorateLinks();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }


})();
`;

  return new Response(scriptContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
