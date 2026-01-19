"use strict";
(function () {
  "use strict";
  const u =
      window.location.hostname === "localhost" ||
      window.location.hostname.includes(".repl.co") ||
      window.location.hostname.includes("127.0.0.1"),
    l = u
      ? console.log.bind(console, "[TrackFather-Redirect]")
      : function () {},
    a = u
      ? console.error.bind(console, "[TrackFather-Redirect]")
      : function () {},
    d = {
      TRACKFATHER_ID: "trackfather_id",
      SESSION_ID: "trackfather_session_id",
      SESSION_TIMESTAMP: "trackfather_session_timestamp",
      PAGE_VIEW_SENT: "trackfather_page_view_sent",
    },
    f = 365 * 24 * 60 * 60 * 1e3,
    h = 5e3;
  ((window.TrackFatherRedirect = {
    config: {},
    data: {},
    initialized: !1,
    init: function () {
      try {
        if (
          !window.TrackFatherConfig ||
          !window.TrackFatherConfig.workspace_id
        ) {
          a("TrackFatherConfig n\xE3o definido ou workspace_id ausente");
          return;
        }
        ((this.config = Object.assign(
          {
            lead_type: "bot",
            api_endpoint: "https://trackfather.com/api/track/event",
            pixel_id: "25009624982012197",
          },
          window.TrackFatherConfig,
        )),
          this.showConsoleBranding(),
          this.config.pixel_id && this.initFacebookPixel(this.config.pixel_id),
          this.captureData(),
          this.manageIdentifiers(),
          (this.initialized = !0),
          this.showRedirectLoading(null),
          setTimeout(() => {
            this.autoRedirect();
          }, 100));
      } catch (e) {
        a("Erro na inicializa\xE7\xE3o:", e);
      }
    },
    showConsoleBranding: function () {
      try {
        if (window.__trackfather_redirect_branded) return;
        ((window.__trackfather_redirect_branded = !0),
          console.log(
            `%c\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 
\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2551 \u2588\u2588\u2554\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557
   \u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D
   \u2588\u2588\u2551   \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2588\u2588\u2557 \u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557
   \u2588\u2588\u2551   \u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2557\u2588\u2588\u2551     \u2588\u2588\u2551  \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2551
   \u255A\u2550\u255D   \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D  \u255A\u2550\u255D   \u255A\u2550\u255D   \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D`,
            "color: #4F46E5; font-family: monospace; font-size: 10px;",
          ),
          console.log(
            "%c\u{1F680} Este site usa TrackFather Redirect - Auto-tracking ativado",
            "color: #4F46E5; font-size: 14px; font-weight: bold; padding: 8px 0;",
          ),
          console.log(
            "%c\u{1F4CA} Redirecionamento autom\xE1tico com tracking completo",
            "color: #6B7280; font-size: 12px;",
          ),
          console.log(
            "%c\u{1F517} Conhe\xE7a mais em: https://trackfather.com",
            "color: #10B981; font-size: 12px; font-weight: bold;",
          ),
          console.log(
            "%c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
            "color: #E5E7EB;",
          ));
      } catch {}
    },
    initFacebookPixel: function (e) {
      try {
        if (window.fbq) {
          (l("Facebook Pixel j\xE1 est\xE1 inicializado"),
            window.fbq("init", e),
            window.fbq("track", "PageView"),
            l("Facebook Pixel ID adicional configurado:", e));
          return;
        }
        ((function (t, i, n, r, o, s, c) {
          t.fbq ||
            ((o = t.fbq =
              function () {
                o.callMethod
                  ? o.callMethod.apply(o, arguments)
                  : o.queue.push(arguments);
              }),
            t._fbq || (t._fbq = o),
            (o.push = o),
            (o.loaded = !0),
            (o.version = "2.0"),
            (o.queue = []),
            (s = i.createElement(n)),
            (s.async = !0),
            (s.src = r),
            (c = i.getElementsByTagName(n)[0]),
            c.parentNode.insertBefore(s, c));
        })(
          window,
          document,
          "script",
          "https://connect.facebook.net/en_US/fbevents.js",
        ),
          window.fbq("init", e),
          l("\u2705 Facebook Pixel inicializado com ID:", e));
      } catch (t) {
        a("Erro ao inicializar Facebook Pixel:", t);
      }
    },
    captureData: function () {
      try {
        const e = new URLSearchParams(window.location.search),
          t = window.location.href;
        this.data = {
          url: t,
          domain: window.location.hostname,
          slug: window.location.pathname,
          referrer: document.referrer || null,
          utm_source: e.get("utm_source") || null,
          utm_campaign: e.get("utm_campaign") || null,
          utm_content: e.get("utm_content") || null,
          utm_medium: e.get("utm_medium") || null,
          utm_term: e.get("utm_term") || null,
          utm_id: e.get("utm_id") || null,
          adset_id: e.get("adset_id") || e.get("adsetid") || null,
          ad_id: e.get("ad_id") || e.get("adid") || null,
          creative_id: e.get("creative_id") || e.get("creativeid") || null,
          placement_id: e.get("placement_id") || e.get("placementid") || null,
          campaign_id: e.get("campaign_id") || e.get("campaignid") || null,
          fbclid: e.get("fbclid") || null,
          fbp: this.getCookie("_fbp") || null,
          fbc: this.generateFbc(),
          gclid: e.get("gclid") || null,
          wbraid: e.get("wbraid") || null,
          gbraid: e.get("gbraid") || null,
          ttclid: e.get("ttclid") || null,
          ttp: this.getCookie("_ttp") || null,
          kwclid: e.get("kwclid") || null,
          user_agent: navigator.userAgent,
          device_type: this.getDeviceType(),
          device_model: this.getDeviceModel(),
          operating_system: this.getOperatingSystem(),
          browser: this.getBrowser(),
          event_timestamp: new Date().toISOString(),
          workspace_id: this.config.workspace_id,
          lead_type: this.config.lead_type,
        };
      } catch (e) {
        (a("Erro na captura de dados:", e),
          (this.data = {
            workspace_id: this.config.workspace_id,
            lead_type: this.config.lead_type,
            event_timestamp: new Date().toISOString(),
          }));
      }
    },
    manageIdentifiers: function () {
      try {
        let e = this.loadId();
        ((!e || !this.isValidTrackfatherId(e)) &&
          ((e = this.generateId()), this.saveId(e)),
          (this.data.trackfather_id = e));
        const t = this.generateId();
        (sessionStorage.setItem(d.SESSION_ID, t),
          sessionStorage.setItem(d.SESSION_TIMESTAMP, Date.now().toString()),
          (this.data.session_id = t));
      } catch (e) {
        (a("Erro no gerenciamento de identificadores:", e),
          (this.data.trackfather_id = this.generateId()),
          (this.data.session_id = this.generateId()));
      }
    },
    autoRedirect: function () {
      try {
        const e = {
          element_tag: "auto-redirect",
          element_id: "trackfather-auto-redirect",
          element_classes: "trackfather-redirect auto",
          element_text: "Auto Redirect",
          element_href: null,
          element_type: "auto",
          element_value: null,
          auto_redirect: !0,
        };
        this.sendEvent("click_button", e);
      } catch (e) {
        (this.hideRedirectLoading(), a("Erro no autoRedirect:", e));
      }
    },
    sendEvent: function (e, t) {
      try {
        const i = Object.assign({}, this.data, t, {
          event_type: e,
          event_timestamp: new Date().toISOString(),
        });
        this.makeApiRequest(i)
          .then((n) => {
            (n && n.trackfather_id && this.saveId(n.trackfather_id),
              e === "click_button" &&
                n &&
                (n.redirect_url
                  ? ((this.currentRedirectUrl = n.redirect_url),
                    this.handleInstantRedirect(n.redirect_url))
                  : n.invite_link
                    ? ((this.currentRedirectUrl = n.invite_link),
                      this.handleInstantRedirect(n.invite_link))
                    : this.hideRedirectLoading()));
          })
          .catch((n) => {
            const r = n.message || "";
            (r.includes("UNAUTHORIZED_URL") ||
            r.includes("n\xE3o autorizada") ||
            r.includes("Domain not authorized") ||
            r.includes("403")
              ? this.showBlockedUrlMessage()
              : this.hideRedirectLoading(),
              a("Erro no envio do evento:", n));
          });
      } catch (i) {
        a("Erro no sendEvent:", i);
      }
    },
    makeApiRequest: function (e) {
      const t = this;
      return new Promise((i, n) => {
        try {
          const r = new XMLHttpRequest(),
            s = setTimeout(() => {
              (r.abort(), n(new Error("Request timeout")));
            }, 3e3);
          ((r.onreadystatechange = function () {
            if (r.readyState === 4) {
              clearTimeout(s);
              try {
                if (r.status >= 200 && r.status < 300) {
                  let c = {};
                  try {
                    c = JSON.parse(r.responseText || "{}");
                  } catch {}
                  i(c);
                } else n(new Error(`HTTP ${r.status}: ${r.responseText}`));
              } catch (c) {
                n(c);
              }
            }
          }),
            r.open("POST", t.config.api_endpoint, !0),
            r.setRequestHeader("Content-Type", "application/json"),
            r.send(JSON.stringify(e)));
        } catch (r) {
          n(r);
        }
      });
    },
    generateId: function () {
      try {
        return (
          "tf_" +
          Date.now().toString(36) +
          "_" +
          Math.random().toString(36).substring(2, 8)
        );
      } catch {
        return "tf_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
      }
    },
    loadId: function () {
      try {
        let e = this.getCookie(d.TRACKFATHER_ID);
        if (e && this.isValidTrackfatherId(e)) return e;
        let t = localStorage.getItem(d.TRACKFATHER_ID);
        return t && this.isValidTrackfatherId(t) ? (this.saveId(t), t) : null;
      } catch {
        return null;
      }
    },
    saveId: function (e) {
      try {
        (this.saveCookie(d.TRACKFATHER_ID, e),
          localStorage.setItem(d.TRACKFATHER_ID, e));
      } catch (t) {
        a("Erro ao salvar ID:", t);
      }
    },
    isValidTrackfatherId: function (e) {
      try {
        return !(
          !e ||
          typeof e != "string" ||
          !e.startsWith("tf_") ||
          e.length < 15 ||
          (e.match(/_/g) || []).length < 2
        );
      } catch {
        return !1;
      }
    },
    getCookie: function (e) {
      try {
        const i = `; ${document.cookie}`.split(`; ${e}=`);
        return i.length === 2 ? i.pop().split(";").shift() : null;
      } catch {
        return null;
      }
    },
    saveCookie: function (e, t) {
      try {
        const i = new Date();
        i.setTime(i.getTime() + 365 * 24 * 60 * 60 * 1e3);
        const n = window.location.protocol === "https:",
          r = window.location.hostname;
        let o = "";
        if (r.includes(".")) {
          const s = r.split(".");
          s.length >= 3 && (o = "; domain=." + s.slice(-2).join("."));
        }
        ((document.cookie = `${e}=${t}; expires=${i.toUTCString()}; path=/; SameSite=Lax${n ? "; Secure" : ""}`),
          (document.cookie = `${e}=${t}; expires=${i.toUTCString()}; path=/; SameSite=Lax${n ? "; Secure" : ""}${o}`));
      } catch (i) {
        a("Erro ao salvar cookie:", i);
      }
    },
    generateFbc: function () {
      try {
        const e = new URLSearchParams(window.location.search).get("fbclid");
        return e
          ? `fb.1.${Math.floor(Date.now() / 1e3)}.${e}`
          : this.getCookie("_fbc") || null;
      } catch {
        return null;
      }
    },
    getDeviceType: function () {
      try {
        const e = navigator.userAgent.toLowerCase();
        return /tablet|ipad|playbook|silk/i.test(e)
          ? "tablet"
          : /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
                e,
              )
            ? "mobile"
            : "desktop";
      } catch {
        return "unknown";
      }
    },
    getDeviceModel: function () {
      try {
        const e = navigator.userAgent;
        return e.includes("iPhone")
          ? e.includes("iPhone15")
            ? "iPhone 15"
            : e.includes("iPhone14")
              ? "iPhone 14"
              : e.includes("iPhone13")
                ? "iPhone 13"
                : "iPhone"
          : e.includes("iPad")
            ? "iPad"
            : e.includes("Android")
              ? e.includes("SM-G")
                ? "Samsung Galaxy"
                : e.includes("Pixel")
                  ? "Google Pixel"
                  : "Android"
              : "Unknown";
      } catch {
        return "Unknown";
      }
    },
    getOperatingSystem: function () {
      try {
        const e = navigator.userAgent;
        return e.includes("Windows NT 10")
          ? "Windows 10"
          : e.includes("Windows NT")
            ? "Windows"
            : e.includes("Mac OS X")
              ? "macOS"
              : e.includes("Android")
                ? "Android"
                : e.includes("iPhone") || e.includes("iPad")
                  ? "iOS"
                  : e.includes("Linux")
                    ? "Linux"
                    : "Unknown";
      } catch {
        return "Unknown";
      }
    },
    getBrowser: function () {
      try {
        const e = navigator.userAgent;
        return e.includes("Edg/")
          ? "Microsoft Edge"
          : e.includes("Chrome/") && !e.includes("Edg/")
            ? "Google Chrome"
            : e.includes("Firefox/")
              ? "Mozilla Firefox"
              : e.includes("Safari/") && !e.includes("Chrome/")
                ? "Safari"
                : e.includes("Opera/") || e.includes("OPR/")
                  ? "Opera"
                  : "Unknown";
      } catch {
        return "Unknown";
      }
    },
    showRedirectLoading: function (e) {
      try {
        (this.hideRedirectLoading(), (this.currentRedirectUrl = e));
        const t = document.createElement("div");
        ((t.id = "trackfather-redirect-loading"),
          (t.innerHTML = `
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            animation: tfFadeIn 0.3s ease-out;
          ">
            <div style="
              width: 80px;
              height: 80px;
              border: 4px solid rgba(255, 255, 255, 0.2);
              border-top: 4px solid #ffffff;
              border-radius: 50%;
              animation: tfSpin 0.8s linear infinite;
              margin-bottom: 32px;
            "></div>
            
            <div style="
              color: #ffffff;
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 3px;
              text-transform: uppercase;
              margin-bottom: 24px;
              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
              animation: tfPulse 1.5s ease-in-out infinite;
            ">REDIRECIONANDO</div>
            
            <a 
              href="#" 
              id="trackfather-manual-redirect"
              style="
                color: rgba(255, 255, 255, 0.7);
                font-size: 14px;
                text-decoration: none;
                transition: all 0.2s ease;
                cursor: pointer;
                padding: 8px 16px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
              "
              onmouseover="this.style.color='#ffffff'; this.style.background='rgba(255, 255, 255, 0.2)';"
              onmouseout="this.style.color='rgba(255, 255, 255, 0.7)'; this.style.background='rgba(255, 255, 255, 0.1)';"
            >N\xE3o foi redirecionado? Clique aqui</a>
          </div>
        `));
        const i = document.createElement("style");
        ((i.id = "trackfather-redirect-styles"),
          (i.textContent = `
          @keyframes tfFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes tfSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes tfPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `));
        const n = document.getElementById("trackfather-redirect-styles");
        (n && n.remove(),
          document.head.appendChild(i),
          document.body.appendChild(t));
        const r = document.getElementById("trackfather-manual-redirect");
        if (r) {
          const o = this;
          r.addEventListener("click", function (s) {
            (s.preventDefault(),
              o.currentRedirectUrl &&
                o.handleInstantRedirect(o.currentRedirectUrl));
          });
        }
      } catch (t) {
        a("Erro ao mostrar loading:", t);
      }
    },
    hideRedirectLoading: function () {
      try {
        const e = document.getElementById("trackfather-redirect-loading");
        e && e.remove();
        const t = document.getElementById("trackfather-blocked-message");
        t && t.remove();
      } catch (e) {
        a("Erro ao esconder loading:", e);
      }
    },
    showBlockedUrlMessage: function () {
      try {
        this.hideRedirectLoading();
        const e = document.createElement("div");
        ((e.id = "trackfather-blocked-message"),
          (e.innerHTML = `
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            animation: tfFadeIn 0.3s ease-out;
            padding: 20px;
            box-sizing: border-box;
          ">
            <div style="
              width: 80px;
              height: 80px;
              border: 4px solid #EF4444;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 24px;
              animation: tfShake 0.5s ease-out;
            ">
              <svg style="width: 40px; height: 40px; color: #EF4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            
            <div style="
              color: #ffffff;
              font-size: 22px;
              font-weight: 700;
              margin-bottom: 16px;
              text-align: center;
              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            ">Acesso Bloqueado</div>
            
            <div style="
              color: rgba(255, 255, 255, 0.8);
              font-size: 15px;
              text-align: center;
              max-width: 400px;
              line-height: 1.6;
              margin-bottom: 24px;
            ">
              Esta URL n\xE3o est\xE1 autorizada nos dom\xEDnios permitidos da campanha.
              <br><br>
              <span style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">
                Prote\xE7\xE3o de seguran\xE7a ativada por TrackFather
              </span>
            </div>
            
            <a 
              href="https://trackfather.com" 
              target="_blank"
              style="
                color: #4F46E5;
                font-size: 14px;
                font-weight: 600;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.95);
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
              "
              onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 20px rgba(79, 70, 229, 0.3)';"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
            >
              <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Conhe\xE7a o TrackFather
            </a>
          </div>
        `));
        const t = document.createElement("style");
        ((t.id = "trackfather-blocked-styles"),
          (t.textContent = `
          @keyframes tfFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes tfShake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
        `));
        const i = document.getElementById("trackfather-blocked-styles");
        (i && i.remove(),
          document.head.appendChild(t),
          document.body.appendChild(e));
      } catch (e) {
        a("Erro ao mostrar mensagem de bloqueio:", e);
      }
    },
    handleInstantRedirect: function (e) {
      try {
        if (!e || typeof e != "string") {
          this.hideRedirectLoading();
          return;
        }
        let t;
        try {
          t = new URL(e).href;
        } catch {
          t = e;
        }
        (window.location.replace
          ? window.location.replace(t)
          : (window.location.href = t),
          setTimeout(() => {
            window.location.assign
              ? window.location.assign(t)
              : window.open(t, "_self");
          }, 100));
      } catch (t) {
        (this.hideRedirectLoading(), a("Erro no redirecionamento:", t));
        try {
          window.open(e, "_self");
        } catch (i) {
          a("Erro no fallback de redirecionamento:", i);
        }
      }
    },
  }),
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", function () {
          window.TrackFatherRedirect.init();
        })
      : setTimeout(function () {
          window.TrackFatherRedirect.init();
        }, 1));
})();
//# sourceMappingURL=trackfather-redirect.min.js.map
