
export async function GET(request: Request) {
    const scriptContent = `
(function() {
  console.log("TrackGram Script Loaded");

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

  // 2. Identify / Create Visitor
  let vid = localStorage.getItem('track_vid');
  if (!vid) {
    vid = generateUUID();
    localStorage.setItem('track_vid', vid);
  }

  // 3. Facebook Parameters (FBC & FBP)
  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get('fbclid');
  
  // FBC
  if (fbclid) {
    const fbc = 'fb.1.' + Date.now() + '.' + fbclid;
    setCookie('_fbc', fbc, 90);
  }
  
  // FBP
  if (!getCookie('_fbp')) {
    const fbp = 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 10000000000);
    setCookie('_fbp', fbp, 90);
  }

  // 4. Link Decoration
  // Automatically find links pointing to our tracking domain and append IDs
  function decorateLinks() {
    const links = document.getElementsByTagName('a');
    // The origin where the script is hosted (e.g., track-gram.com)
    // We can infer it from the script src, but for now let's assume specific patterns
    // Ideally we match links going to /t/
    
    // We derived the script origin from the script tag itself ideally, but here we can't easily.
    // So we'll look for any link that contains '/t/' which is our funnel pattern.
    
    for (var i = 0; i < links.length; i++) {
      const href = links[i].getAttribute('href');
      if (href && href.includes('/t/')) {
        const separator = href.includes('?') ? '&' : '?';
        const fbc = getCookie('_fbc') || '';
        const fbp = getCookie('_fbp') || '';
        
        let newHref = href;
        if (!newHref.includes('vid=')) newHref += separator + 'vid=' + vid;
        // Also pass FBC/FBP explicitly in URL to bypass cookie limits
        if (fbc && !newHref.includes('fbc=')) newHref += '&fbc=' + encodeURIComponent(fbc);
        if (fbp && !newHref.includes('fbp=')) newHref += '&fbp=' + encodeURIComponent(fbp);
        
        links[i].setAttribute('href', newHref);
      }
    }
  }

  // Run on load and on DOM changes (for SPAs)
  decorateLinks();
  setInterval(decorateLinks, 2000);

})();
`;

    return new Response(scriptContent, {
        headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}
