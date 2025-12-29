/**
 * =============================================================
 * SCRIPT PARA: betlionpro.com (campo de código personalizado)
 * =============================================================
 * 
 * COMO USAR:
 * 1. Acesse o painel da bet e vá nas configurações de código personalizado
 * 2. Cole este script no campo do <head>
 * 3. Salve as configurações
 * 
 * IMPORTANTE: Substitua a URL do TRACKING_API pelo seu domínio real!
 * 
 * FUNCIONAMENTO:
 * 1. Quando o usuário entra na bet, lê vid/fbc/fbp/fingerprint da URL
 * 2. Salva esses dados no localStorage do domínio da bet
 * 3. Quando o usuário clica em "Criar conta", captura o email e envia
 *    para o seu servidor junto com os dados de tracking + fingerprint
 * 4. Seu servidor faz o match usando múltiplos critérios (não só IP)
 */

(function() {
    'use strict';

    // ===============================================
    // CONFIGURAÇÃO - ALTERE ESTA URL!
    // ===============================================
    const TRACKING_API = 'https://tracktelegram.vercel.app/api/bet/identify';
    // ===============================================

    // Chaves de storage
    const STORAGE_PREFIX = 'bet_track_';

    // Função para pegar parâmetro da URL (Robusta)
    function getUrlParam(name) {
        // 1. Tentar URLSearchParams padrão
        const urlParams = new URLSearchParams(window.location.search);
        let val = urlParams.get(name);
        if (val) return val;
        
        // 2. Fallback: Tentar extrair da URL completa (útil se estiver após #)
        try {
            const url = new URL(window.location.href);
            val = url.searchParams.get(name);
            if (val) return val;
        } catch(e) {}
        
        // 3. Fallback manual regex (último recurso)
        const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
        const results = regex.exec(window.location.href);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    // Função para salvar no localStorage
    function saveToStorage(key, value) {
        try {
            if (value) {
                localStorage.setItem(STORAGE_PREFIX + key, value);
            }
        } catch (e) {}
    }

    // Função para pegar do localStorage
    function getFromStorage(key) {
        try {
            return localStorage.getItem(STORAGE_PREFIX + key) || '';
        } catch (e) {
            return '';
        }
    }

// Função para ler cookies (fallback se não vier na URL)
    function getCookie(name) {
        var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
        return v ? v[2] : null;
    }

    // ======= CORREÇÃO CRÍTICA: Gerar fbc a partir do fbclid =======
    // Conforme documentação Meta CAPI:
    // "Se você não tem o cookie _fbc, o valor de fbc é: fb.1.<timestamp_ms>.<fbclid>"
    function generateFbc() {
        // 1. Tentar pegar do storage primeiro (pode ter sido salvo anteriormente)
        const storedFbc = getFromStorage('fbc');
        if (storedFbc) return storedFbc;
        
        // 2. Tentar pegar da URL
        const urlFbc = getUrlParam('fbc');
        if (urlFbc) return urlFbc;
        
        // 3. Tentar pegar do cookie
        const cookieFbc = getCookie('_fbc');
        if (cookieFbc) return cookieFbc;
        
        // 4. Se não tem fbc, mas tem fbclid na URL, GERAR o fbc
        const fbclid = getUrlParam('fbclid');
        if (fbclid) {
            const timestamp = Date.now();
            const generatedFbc = `fb.1.${timestamp}.${fbclid}`;
            console.log('[BetTracker] fbc gerado a partir do fbclid:', generatedFbc.substring(0, 50) + '...');
            return generatedFbc;
        }
        
        return null;
    }

    // Gerar fingerprint do navegador (mesmo algoritmo do betia-tracker)
    function generateFingerprint() {
        const components = [];
        
        components.push(navigator.userAgent || '');
        components.push(screen.width + 'x' + screen.height);
        
        try {
            components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
        } catch (e) {
            components.push('');
        }
        
        components.push(navigator.language || '');
        components.push(navigator.platform || '');
        components.push(screen.colorDepth || '');
        
        const fingerprintString = components.join('|');
        
        let hash = 0;
        for (let i = 0; i < fingerprintString.length; i++) {
            const char = fingerprintString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(36);
    }

    // Capturar e salvar parâmetros da URL (agora incluindo fingerprint)
    function captureUrlParams() {
        const params = [
            'vid', 'fbc', 'fbp', 
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
            'funnel_id', // Identificador de funil para roteamento interno
            'fp', 'ua', 'sr', 'tz', 'lang' // Novos params de fingerprint
        ];
        
        params.forEach(function(param) {
            const value = getUrlParam(param);
            if (value) {
                saveToStorage(param, value);
                console.log('[BetTracker] Salvo:', param, '=', value.substring(0, 30) + (value.length > 30 ? '...' : ''));
            }
        });
    }

    // Obter todos os dados de tracking + fingerprint + cookies
    function getTrackingData() {
        // Tentar pegar fbp dos cookies se não tiver no storage/URL
        const cookieFbp = getCookie('_fbp');
        
        return {
            // Dados de tracking originais (Prioridade: URL > Storage > Cookie)
            visitor_id: getFromStorage('vid') || getUrlParam('vid'),
            fbc: generateFbc(), // AGORA COM GERAÇÃO CORRETA!
            fbp: getFromStorage('fbp') || getUrlParam('fbp') || cookieFbp,
            
            utm_source: getFromStorage('utm_source') || getUrlParam('utm_source'),
            utm_medium: getFromStorage('utm_medium') || getUrlParam('utm_medium'),
            utm_campaign: getFromStorage('utm_campaign') || getUrlParam('utm_campaign'),
            utm_content: getFromStorage('utm_content') || getUrlParam('utm_content'),
            utm_term: getFromStorage('utm_term') || getUrlParam('utm_term'),
            funnel_id: getFromStorage('funnel_id') || getUrlParam('funnel_id'),
            
            // ======= FINGERPRINT PARA MATCHING ROBUSTO =======
            // Se veio da URL (via betia-tracker), usa. Senão, gera aqui.
            fingerprint: getFromStorage('fp') || getUrlParam('fp') || generateFingerprint(),
            user_agent: getFromStorage('ua') || getUrlParam('ua') || navigator.userAgent,
            screen_resolution: getFromStorage('sr') || getUrlParam('sr') || (screen.width + 'x' + screen.height),
            timezone: getFromStorage('tz') || getUrlParam('tz') || (function() { 
                try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } 
                catch(e) { return ''; } 
            })(),
            language: getFromStorage('lang') || getUrlParam('lang') || navigator.language,
        };
    }

    // Enviar dados para o servidor
    function sendIdentification(email, phone) {
        const trackingData = getTrackingData();
        
        // Log de debug - mostrar se temos dados suficientes para match
        if (!trackingData.visitor_id && !trackingData.fbc) {
            console.log('[BetTracker] visitor_id/fbc ausentes. Usando fingerprint e cookies para match:', {
                fbp: trackingData.fbp,
                fingerprint: trackingData.fingerprint
            });
        }

        const payload = {
            email: email,
            phone: phone || '',
            ...trackingData
        };

        console.log('[BetTracker] Enviando identificação completa:', {
            email: email,
            has_vid: !!trackingData.visitor_id,
            has_fbc: !!trackingData.fbc,
            has_fbp: !!trackingData.fbp,
            fingerprint: trackingData.fingerprint
        });

        // Enviar de forma assíncrona (não bloqueia o cadastro)
        fetch(TRACKING_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            keepalive: true // Garante envio mesmo se navegar
        }).then(function(response) {
            return response.json();
        }).then(function(data) {
            console.log('[BetTracker] Resposta:', data);
            if (data.matched_by) {
                console.log('[BetTracker] Match feito por:', data.matched_by);
            }
        }).catch(function(error) {
            console.error('[BetTracker] Erro:', error);
        });
    }

    // Interceptar clique no botão de cadastro
    function setupCadastroListener() {
        // Aguardar o botão existir
        function trySetup() {
            const btnCadastro = document.querySelector('#criar-conta');
            
            if (btnCadastro && !btnCadastro._betTrackerAttached) {
                btnCadastro._betTrackerAttached = true;
                
                btnCadastro.addEventListener('click', function() {
                    // Pegar valores dos campos
                    const emailInput = document.querySelector('#email_cadastro');
                    const phoneInput = document.querySelector('#telefone');
                    
                    if (emailInput && emailInput.value) {
                        sendIdentification(emailInput.value, phoneInput ? phoneInput.value : '');
                    }
                }, true); // Capture phase para pegar antes do handler original

                console.log('[BetTracker] Listener de cadastro configurado');
            }

            // Também tentar em modais que podem ser carregados dinamicamente
            const modalObserver = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes.length) {
                        const newBtn = document.querySelector('#criar-conta');
                        if (newBtn && !newBtn._betTrackerAttached) {
                            trySetup();
                        }
                    }
                });
            });

            if (document.body) {
                modalObserver.observe(document.body, { childList: true, subtree: true });
            }
        }

        // Tentar várias vezes (modais dinâmicos)
        trySetup();
        setTimeout(trySetup, 1000);
        setTimeout(trySetup, 2000);
        setTimeout(trySetup, 5000);
    }

    // Inicialização
    function init() {
        console.log('[BetTracker] Inicializando com suporte avançado (Cookies + Fingerprint)...');
        
        // 1. Capturar parâmetros da URL
        captureUrlParams();
        
        // 2. Configurar listener de cadastro
        setupCadastroListener();
        
        // 3. Log dos dados disponíveis
        const data = getTrackingData();
        console.log('[BetTracker] Dados de tracking:', {
            visitor_id: data.visitor_id || '(vazio)',
            fbc: data.fbc ? '✓ (Cookie/URL)' : '✗',
            fbp: data.fbp ? '✓ (Cookie/URL)' : '✗',
            fingerprint: data.fingerprint,
        });
    }

    // Executar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
