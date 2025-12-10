
export async function GET(request: Request) {
    const scriptContent = `
(function() {
  console.log("TrackGram Script Loaded v2.0");

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
    document.cookie = name + "=" + value + ";path=/;expires=" + d.toGMTString() + ";SameSite=Lax";
  }

  function getUrlParam(name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // 2. Identify / Create Visitor
  let vid = localStorage.getItem('track_vid');
  if (!vid) {
    vid = generateUUID();
    localStorage.setItem('track_vid', vid);
  }

  // 3. Facebook Parameters (FBC & FBP)
  const fbclid = getUrlParam('fbclid');
  
  // Salvar fbclid no cookie se disponível
  if (fbclid) {
    setCookie('_fbclid', fbclid, 90);
  }
  
  // FBC - Click ID (gerado a partir do fbclid)
  let fbc = getCookie('_fbc');
  if (fbclid && !fbc) {
    fbc = 'fb.1.' + Date.now() + '.' + fbclid;
    setCookie('_fbc', fbc, 90);
  }
  
  // FBP - Browser ID
  let fbp = getCookie('_fbp');
  if (!fbp) {
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
      if (href && href.includes('/t/')) {
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

        // Adicionar fbclid (se disponível)
        if (fbclid && !url.searchParams.has('fbclid')) {
          url.searchParams.set('fbclid', fbclid);
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

        links[i].setAttribute('href', url.toString());
      }
    }
  }

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

  console.log("TrackGram: vid=" + vid + ", fbc=" + fbc + ", fbp=" + fbp);
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
