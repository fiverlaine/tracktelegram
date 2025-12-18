!function () {
    "use strict";
    const e = "localhost" === window.location.hostname || window.location.hostname.includes(".repl.co") || window.location.hostname.includes("127.0.0.1")
        , t = e ? console.log.bind(console, "[TrackFather]") : function () { }
        , n = e ? console.error.bind(console, "[TrackFather]") : function () { }
        , i = "trackfather_id"
        , o = "trackfather_session_id"
        , a = "trackfather_session_timestamp"
        , r = "trackfather_page_view_sent";
    window.TrackFather = {
        config: {},
        data: {},
        initialized: !1,
        pendingEvents: [],
        trackEvent: function (e, t) {
            try {
                if (!this.initialized)
                    return void this.pendingEvents.push({
                        type: "custom",
                        eventType: e,
                        customData: t
                    });
                const n = Object.assign({}, t || {});
                this.sendEvent(e, n)
            } catch (e) {
                n("Erro no trackEvent:", e)
            }
        },
        trackPageView: function () {
            try {
                if (!this.initialized)
                    return void this.pendingEvents.push({
                        type: "page_view"
                    });
                this.sendPageView()
            } catch (e) {
                n("Erro no trackPageView:", e)
            }
        },
        trackButtonClick: function (e) {
            try {
                if (!this.initialized)
                    return void this.pendingEvents.push({
                        type: "button_click",
                        element: e
                    });
                this.sendButtonClick(e)
            } catch (e) {
                n("Erro no trackButtonClick:", e)
            }
        },
        init: function () {
            try {
                if (!window.TrackFatherConfig || !window.TrackFatherConfig.workspace_id)
                    return void n("TrackFatherConfig não definido ou workspace_id ausente");
                this.config = Object.assign({
                    lead_type: "bot",
                    api_endpoint: 'https://trackfather.com/api/track/event',
                    pixel_id: '25009624982012195'
                }, window.TrackFatherConfig),
                    this.showConsoleBranding(),
                    this.config.pixel_id && this.initFacebookPixel(this.config.pixel_id),
                    this.captureData(),
                    this.manageIdentifiers(),
                    this.setupEventListeners(),
                    this.initialized = !0,
                    this.processPendingEvents(),
                    setTimeout(() => {
                        this.sendPageView()
                    }
                        , 100)
            } catch (e) {
                n("Erro na inicialização:", e)
            }
        },
        showConsoleBranding: function () {
            try {
                if (window.__trackfather_branded)
                    return;
                window.__trackfather_branded = !0,
                    console.log("%c████████╗██████╗  █████╗  ██████╗██╗  ██╗███████╗ █████╗ ████████╗██╗  ██╗███████╗██████╗ \n╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗╚══██╔══╝██║  ██║██╔════╝██╔══██╗\n   ██║   ██████╔╝███████║██║     █████╔╝ █████╗  ███████║   ██║   ███████║█████╗  ██████╔╝\n   ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██║   ██║   ██╔══██║██╔══╝  ██╔══██╗\n   ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗██║     ██║  ██║   ██║   ██║  ██║███████╗██║  ██║\n   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝", "color: #4F46E5; font-family: monospace; font-size: 10px;"),
                    console.log("%c🚀 Este site usa TrackFather - Marketing Attribution & Analytics", "color: #4F46E5; font-size: 14px; font-weight: bold; padding: 8px 0;"),
                    console.log("%c📊 Plataforma completa de atribuição de marketing para Telegram", "color: #6B7280; font-size: 12px;"),
                    console.log("%c🔗 Conheça mais em: https://trackfather.com", "color: #10B981; font-size: 12px; font-weight: bold;"),
                    console.log("%c─────────────────────────────────────────────────────", "color: #E5E7EB;")
            } catch (e) { }
        },
        initFacebookPixel: function (e) {
            try {
                if (window.fbq)
                    return t("Facebook Pixel já está inicializado"),
                        window.fbq("init", e),
                        window.fbq("track", "PageView"),
                        void t("Facebook Pixel ID adicional configurado:", e);
                i = window,
                    o = document,
                    a = "script",
                    i.fbq || (r = i.fbq = function () {
                        r.callMethod ? r.callMethod.apply(r, arguments) : r.queue.push(arguments)
                    }
                        ,
                        i._fbq || (i._fbq = r),
                        r.push = r,
                        r.loaded = !0,
                        r.version = "2.0",
                        r.queue = [],
                        (s = o.createElement(a)).async = !0,
                        s.src = "https://connect.facebook.net/en_US/fbevents.js",
                        (c = o.getElementsByTagName(a)[0]).parentNode.insertBefore(s, c)),
                    window.fbq("init", e),
                    t("✅ Facebook Pixel inicializado com ID:", e)
            } catch (e) {
                n("Erro ao inicializar Facebook Pixel:", e)
            }
            var i, o, a, r, s, c
        },
        captureData: function () {
            try {
                const e = new URLSearchParams(window.location.search)
                    , t = window.location.href;
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
                    kwclid: e.get("kwclid") || null,
                    user_agent: navigator.userAgent,
                    device_type: this.getDeviceType(),
                    device_model: this.getDeviceModel(),
                    operating_system: this.getOperatingSystem(),
                    browser: this.getBrowser(),
                    event_timestamp: (new Date).toISOString(),
                    workspace_id: this.config.workspace_id,
                    lead_type: this.config.lead_type
                }
            } catch (e) {
                n("Erro na captura de dados:", e),
                    this.data = {
                        workspace_id: this.config.workspace_id,
                        lead_type: this.config.lead_type,
                        event_timestamp: (new Date).toISOString()
                    }
            }
        },
        manageIdentifiers: function () {
            try {
                let e = this.loadId();
                e && this.isValidTrackfatherId(e) || (e = this.generateId(),
                    this.saveId(e)),
                    this.data.trackfather_id = e,
                    this.manageSession()
            } catch (e) {
                n("Erro no gerenciamento de identificadores:", e),
                    this.data.trackfather_id = this.generateId(),
                    this.data.session_id = this.generateId()
            }
        },
        manageSession: function () {
            try {
                const e = this.generateId()
                    , t = Date.now();
                sessionStorage.setItem(o, e),
                    sessionStorage.setItem(a, t.toString()),
                    sessionStorage.removeItem(r),
                    this.data.session_id = e
            } catch (e) {
                n("Erro no gerenciamento de sessão:", e),
                    this.data.session_id = this.generateId()
            }
        },
        setupEventListeners: function () {
            try {
                document.addEventListener("click", e => {
                    try {
                        let t = e.target;
                        for (let e = 0; e < 3 && t; e++) {
                            if (t.classList && t.classList.contains("trackfather") || t.className && t.className.includes("trackfather")) {
                                this.sendButtonClick(t);
                                break
                            }
                            t = t.parentElement
                        }
                    } catch (e) {
                        n("Erro no event listener de click:", e)
                    }
                }
                    , !0)
            } catch (e) {
                n("Erro na configuração de event listeners:", e)
            }
        },
        processPendingEvents: function () {
            try {
                const e = this.pendingEvents.slice();
                this.pendingEvents = [],
                    e.forEach(e => {
                        try {
                            switch (e.type) {
                                case "custom":
                                    this.sendEvent(e.eventType, e.customData);
                                    break;
                                case "page_view":
                                    this.sendPageView();
                                    break;
                                case "button_click":
                                    this.sendButtonClick(e.element)
                            }
                        } catch (e) {
                            n("Erro processando evento pendente:", e)
                        }
                    }
                    )
            } catch (e) {
                n("Erro no processamento de eventos pendentes:", e)
            }
        },
        sendPageView: function () {
            try {
                if (sessionStorage.getItem(r))
                    return;
                this.sendEvent("page_view", {}),
                    sessionStorage.setItem(r, "true")
            } catch (e) {
                n("Erro no sendPageView:", e)
            }
        },
        sendButtonClick: function (e) {
            try {
                const t = {
                    element_tag: e.tagName ? e.tagName.toLowerCase() : null,
                    element_id: e.id || null,
                    element_classes: e.className || null,
                    element_text: e.textContent ? e.textContent.trim().substring(0, 100) : null,
                    element_href: e.href || e.getAttribute("href") || null,
                    element_type: e.type || null,
                    element_value: e.value || null
                };
                this.showRedirectLoading(null),
                    this.sendEvent("click_button", t)
            } catch (e) {
                this.hideRedirectLoading(),
                    n("Erro no sendButtonClick:", e)
            }
        },
        sendEvent: function (e, t) {
            try {
                const i = Object.assign({}, this.data, t, {
                    event_type: e,
                    event_timestamp: (new Date).toISOString()
                });
                this.makeApiRequest(i).then(t => {
                    t && t.trackfather_id && this.saveId(t.trackfather_id),
                        "click_button" === e && t && (t.redirect_url ? (this.currentRedirectUrl = t.redirect_url,
                            this.handleInstantRedirect(t.redirect_url)) : t.invite_link ? (this.currentRedirectUrl = t.invite_link,
                                this.handleInstantRedirect(t.invite_link)) : this.hideRedirectLoading())
                }
                ).catch(t => {
                    if ("click_button" === e) {
                        const e = t.message || "";
                        e.includes("UNAUTHORIZED_URL") || e.includes("não autorizada") || e.includes("Domain not authorized") || e.includes("403") ? this.showBlockedUrlMessage() : this.hideRedirectLoading()
                    }
                    n("Erro no envio do evento:", t)
                }
                )
            } catch (e) {
                n("Erro no sendEvent:", e)
            }
        },
        makeApiRequest: function (e) {
            const t = this;
            return new Promise((n, i) => {
                try {
                    const o = new XMLHttpRequest
                        , a = "click_button" === e.event_type ? 3e3 : 5e3
                        , r = setTimeout(() => {
                            o.abort(),
                                i(new Error("Request timeout"))
                        }
                            , a);
                    o.onreadystatechange = function () {
                        if (4 === o.readyState) {
                            clearTimeout(r);
                            try {
                                if (o.status >= 200 && o.status < 300) {
                                    let e = {};
                                    try {
                                        e = JSON.parse(o.responseText || "{}")
                                    } catch (e) { }
                                    n(e)
                                } else
                                    i(new Error(`HTTP ${o.status}: ${o.responseText}`))
                            } catch (e) {
                                i(e)
                            }
                        }
                    }
                        ,
                        o.open("POST", t.config.api_endpoint, !0),
                        o.setRequestHeader("Content-Type", "application/json"),
                        o.send(JSON.stringify(e))
                } catch (e) {
                    i(e)
                }
            }
            )
        },
        generateId: function () {
            try {
                return "tf_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8)
            } catch (e) {
                return "tf_" + Date.now() + "_" + Math.floor(1e6 * Math.random())
            }
        },
        loadId: function () {
            try {
                let e = this.getCookie(i);
                if (e && this.isValidTrackfatherId(e))
                    return e;
                let t = localStorage.getItem(i);
                return t && this.isValidTrackfatherId(t) ? (this.saveId(t),
                    t) : null
            } catch (e) {
                return null
            }
        },
        saveId: function (e) {
            try {
                this.saveCookie(i, e),
                    localStorage.setItem(i, e)
            } catch (e) {
                n("Erro ao salvar ID:", e)
            }
        },
        isValidTrackfatherId: function (e) {
            try {
                if (!e || "string" != typeof e)
                    return !1;
                if (!e.startsWith("tf_"))
                    return !1;
                if (e.length < 15)
                    return !1;
                return !((e.match(/_/g) || []).length < 2)
            } catch (e) {
                return !1
            }
        },
        getCookie: function (e) {
            try {
                const t = `; ${document.cookie}`.split(`; ${e}=`);
                return 2 === t.length ? t.pop().split(";").shift() : null
            } catch (e) {
                return null
            }
        },
        saveCookie: function (e, t) {
            try {
                const n = new Date;
                n.setTime(n.getTime() + 31536e6);
                const i = "https:" === window.location.protocol
                    , o = window.location.hostname;
                let a = "";
                if (o.includes(".")) {
                    const e = o.split(".");
                    a = e.length >= 3 ? "." + e.slice(-2).join(".") : "." + o
                }
                const r = [`${e}=${t}; expires=${n.toUTCString()}; path=/; SameSite=Lax${i ? "; Secure" : ""}`, a ? `${e}=${t}; expires=${n.toUTCString()}; path=/; domain=${a}; SameSite=Lax${i ? "; Secure" : ""}` : null, `${e}=${t}; expires=${n.toUTCString()}; path=/`, `${e}=${t}; max-age=31536000; path=/`].filter(Boolean);
                let s = !1;
                for (let n = 0; n < r.length; n++)
                    try {
                        document.cookie = r[n];
                        if (this.getCookie(e) === t) {
                            s = !0;
                            break
                        }
                    } catch (e) { }
                if (!s)
                    throw new Error("Falha em todas as tentativas de configuração de cookie")
            } catch (e) {
                throw new Error(`Falha ao salvar cookie: ${e.message}`)
            }
        },
        generateFbc: function () {
            try {
                const e = new URLSearchParams(window.location.search).get("fbclid");
                return e ? `fb.1.${Date.now()}.${e}` : null
            } catch (e) {
                return null
            }
        },
        getDeviceType: function () {
            try {
                const e = navigator.userAgent.toLowerCase();
                return /tablet|ipad|playbook|silk/i.test(e) ? "tablet" : /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(e) ? "mobile" : "desktop"
            } catch (e) {
                return "unknown"
            }
        },
        getDeviceModel: function () {
            try {
                const e = navigator.userAgent;
                return e.includes("iPhone") ? e.includes("iPhone15") ? "iPhone 15" : e.includes("iPhone14") ? "iPhone 14" : e.includes("iPhone13") ? "iPhone 13" : "iPhone" : e.includes("iPad") ? "iPad" : e.includes("Android") ? e.includes("SM-G") ? "Samsung Galaxy" : e.includes("Pixel") ? "Google Pixel" : "Android" : "Unknown"
            } catch (e) {
                return "Unknown"
            }
        },
        getOperatingSystem: function () {
            try {
                const e = navigator.userAgent;
                return e.includes("Windows NT 10") ? "Windows 10" : e.includes("Windows NT") ? "Windows" : e.includes("Mac OS X") ? "macOS" : e.includes("Android") ? "Android" : e.includes("iPhone") || e.includes("iPad") ? "iOS" : e.includes("Linux") ? "Linux" : "Unknown"
            } catch (e) {
                return "Unknown"
            }
        },
        getBrowser: function () {
            try {
                const e = navigator.userAgent;
                return e.includes("Edg/") ? "Microsoft Edge" : e.includes("Chrome/") && !e.includes("Edg/") ? "Google Chrome" : e.includes("Firefox/") ? "Mozilla Firefox" : e.includes("Safari/") && !e.includes("Chrome/") ? "Safari" : e.includes("Opera/") || e.includes("OPR/") ? "Opera" : "Unknown"
            } catch (e) {
                return "Unknown"
            }
        },
        showRedirectLoading: function (e) {
            try {
                this.hideRedirectLoading(),
                    this.currentRedirectUrl = e;
                const t = document.createElement("div");
                t.id = "trackfather-redirect-loading",
                    t.innerHTML = '\n          <div style="\n            position: fixed;\n            top: 0;\n            left: 0;\n            width: 100%;\n            height: 100%;\n            background: rgba(0, 0, 0, 0.6);\n            z-index: 999999;\n            display: flex;\n            flex-direction: column;\n            align-items: center;\n            justify-content: center;\n            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', system-ui, sans-serif;\n            backdrop-filter: blur(12px);\n            -webkit-backdrop-filter: blur(12px);\n            animation: tfFadeIn 0.3s ease-out;\n          ">\n            \x3c!-- Spinner Grande --\x3e\n            <div style="\n              width: 80px;\n              height: 80px;\n              border: 4px solid rgba(255, 255, 255, 0.2);\n              border-top: 4px solid #ffffff;\n              border-radius: 50%;\n              animation: tfSpin 0.8s linear infinite;\n              margin-bottom: 32px;\n            "></div>\n            \n            \x3c!-- Texto Principal --\x3e\n            <div style="\n              color: #ffffff;\n              font-size: 24px;\n              font-weight: 700;\n              letter-spacing: 3px;\n              text-transform: uppercase;\n              margin-bottom: 24px;\n              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);\n              animation: tfPulse 1.5s ease-in-out infinite;\n            ">REDIRECIONANDO</div>\n            \n            \x3c!-- Link Manual --\x3e\n            <a \n              href="#" \n              id="trackfather-manual-redirect"\n              style="\n                color: rgba(255, 255, 255, 0.7);\n                font-size: 14px;\n                text-decoration: none;\n                transition: all 0.2s ease;\n                cursor: pointer;\n                padding: 8px 16px;\n                border-radius: 8px;\n                background: rgba(255, 255, 255, 0.1);\n              "\n              onmouseover="this.style.color=\'#ffffff\'; this.style.background=\'rgba(255, 255, 255, 0.2)\';"\n              onmouseout="this.style.color=\'rgba(255, 255, 255, 0.7)\'; this.style.background=\'rgba(255, 255, 255, 0.1)\';"\n            >Não foi redirecionado? Clique aqui</a>\n          </div>\n        ';
                const n = document.createElement("style");
                n.id = "trackfather-redirect-styles",
                    n.textContent = "\n          @keyframes tfFadeIn {\n            from { opacity: 0; }\n            to { opacity: 1; }\n          }\n          @keyframes tfSpin {\n            0% { transform: rotate(0deg); }\n            100% { transform: rotate(360deg); }\n          }\n          @keyframes tfPulse {\n            0%, 100% { opacity: 1; }\n            50% { opacity: 0.7; }\n          }\n        ";
                const i = document.getElementById("trackfather-redirect-styles");
                i && i.remove(),
                    document.head.appendChild(n),
                    document.body.appendChild(t);
                const o = document.getElementById("trackfather-manual-redirect");
                if (o) {
                    const e = this;
                    o.addEventListener("click", function (t) {
                        t.preventDefault(),
                            e.currentRedirectUrl && e.handleInstantRedirect(e.currentRedirectUrl)
                    })
                }
            } catch (e) {
                n("Erro ao mostrar loading:", e)
            }
        },
        hideRedirectLoading: function () {
            try {
                const e = document.getElementById("trackfather-redirect-loading");
                e && e.remove();
                const t = document.getElementById("trackfather-blocked-message");
                t && t.remove()
            } catch (e) {
                n("Erro ao esconder loading:", e)
            }
        },
        showBlockedUrlMessage: function () {
            try {
                this.hideRedirectLoading();
                const e = document.createElement("div");
                e.id = "trackfather-blocked-message",
                    e.innerHTML = '\n          <div style="\n            position: fixed;\n            top: 0;\n            left: 0;\n            width: 100%;\n            height: 100%;\n            background: rgba(0, 0, 0, 0.85);\n            z-index: 999999;\n            display: flex;\n            flex-direction: column;\n            align-items: center;\n            justify-content: center;\n            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', system-ui, sans-serif;\n            backdrop-filter: blur(12px);\n            -webkit-backdrop-filter: blur(12px);\n            animation: tfFadeIn 0.3s ease-out;\n            padding: 20px;\n            box-sizing: border-box;\n          ">\n            \x3c!-- Ícone de Bloqueio --\x3e\n            <div style="\n              width: 80px;\n              height: 80px;\n              border: 4px solid #EF4444;\n              border-radius: 50%;\n              display: flex;\n              align-items: center;\n              justify-content: center;\n              margin-bottom: 24px;\n              animation: tfShake 0.5s ease-out;\n            ">\n              <svg style="width: 40px; height: 40px; color: #EF4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>\n              </svg>\n            </div>\n            \n            \x3c!-- Título --\x3e\n            <div style="\n              color: #ffffff;\n              font-size: 22px;\n              font-weight: 700;\n              margin-bottom: 16px;\n              text-align: center;\n              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);\n            ">Acesso Bloqueado</div>\n            \n            \x3c!-- Mensagem --\x3e\n            <div style="\n              color: rgba(255, 255, 255, 0.8);\n              font-size: 15px;\n              text-align: center;\n              max-width: 400px;\n              line-height: 1.6;\n              margin-bottom: 24px;\n            ">\n              Esta URL não está autorizada nos domínios permitidos da campanha.\n              <br><br>\n              <span style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">\n                Proteção de segurança ativada por TrackFather\n              </span>\n            </div>\n            \n            \x3c!-- Link TrackFather --\x3e\n            <a \n              href="https://trackfather.com" \n              target="_blank"\n              style="\n                color: #4F46E5;\n                font-size: 14px;\n                font-weight: 600;\n                text-decoration: none;\n                padding: 12px 24px;\n                border-radius: 8px;\n                background: rgba(255, 255, 255, 0.95);\n                transition: all 0.2s ease;\n                display: flex;\n                align-items: center;\n                gap: 8px;\n              "\n              onmouseover="this.style.transform=\'scale(1.05)\'; this.style.boxShadow=\'0 4px 20px rgba(79, 70, 229, 0.3)\';"\n              onmouseout="this.style.transform=\'scale(1)\'; this.style.boxShadow=\'none\';"\n            >\n              <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>\n              </svg>\n              Conheça o TrackFather\n            </a>\n          </div>\n        ';
                const t = document.createElement("style");
                t.id = "trackfather-blocked-styles",
                    t.textContent = "\n          @keyframes tfFadeIn {\n            from { opacity: 0; }\n            to { opacity: 1; }\n          }\n          @keyframes tfShake {\n            0%, 100% { transform: translateX(0); }\n            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }\n            20%, 40%, 60%, 80% { transform: translateX(5px); }\n          }\n        ";
                const n = document.getElementById("trackfather-blocked-styles");
                n && n.remove(),
                    document.head.appendChild(t),
                    document.body.appendChild(e)
            } catch (e) {
                n("Erro ao mostrar mensagem de bloqueio:", e)
            }
        },
        handleInstantRedirect: function (e) {
            try {
                if (!e || "string" != typeof e)
                    return void this.hideRedirectLoading();
                let t;
                try {
                    t = new URL(e).href
                } catch (n) {
                    t = e
                }
                window.location.replace ? window.location.replace(t) : window.location.href = t,
                    setTimeout(() => {
                        window.location.assign ? window.location.assign(t) : window.open(t, "_self")
                    }
                        , 100)
            } catch (t) {
                this.hideRedirectLoading(),
                    n("Erro no redirecionamento:", t);
                try {
                    window.open(e, "_self")
                } catch (e) {
                    n("Erro no fallback de redirecionamento:", e)
                }
            }
        }
    },
        "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", function () {
            window.TrackFather.init()
        }) : setTimeout(function () {
            window.TrackFather.init()
        }, 1)
}();
//# sourceMappingURL=trackfather.min.js.map
