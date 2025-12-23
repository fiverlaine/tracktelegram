/**
 * =============================================================
 * SCRIPT PARA: betia.io/codigo/
 * =============================================================
 * 
 * COMO USAR:
 * 1. Cole este script no <head> ou antes do </body> da página betia.io/codigo/
 * 2. Ele vai automaticamente decorar o botão "ACESSAR BETLIONPRO" com os 
 *    parâmetros de tracking (vid, fbc, fbp, utms, fingerprint)
 * 
 * FUNCIONAMENTO:
 * - Lê os parâmetros de tracking do localStorage (salvos quando o usuário
 *   passou pela sua landing page com o script do TrackGram)
 * - Adiciona esses parâmetros na URL do botão que leva para a bet
 * - Também adiciona dados de fingerprint para matching robusto
 * - Assim, quando o usuário chegar na bet, os parâmetros estarão na URL
 */

(function() {
    'use strict';

    // Configuração: URL base da bet (sem parâmetros)
    const BET_URL_PATTERN = 'betlionpro.com';

    // Função para pegar valor do localStorage
    function getStoredValue(key) {
        try {
            return localStorage.getItem(key) || '';
        } catch (e) {
            return '';
        }
    }

    // Função para pegar parâmetro da URL atual
    function getUrlParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name) || '';
    }

    // Função para pegar cookie
    function getCookie(name) {
        const match = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
        return match ? match[2] : '';
    }

    // ======= CORREÇÃO CRÍTICA: Gerar fbc a partir do fbclid =======
    // Conforme documentação Meta CAPI:
    // "Se você não tem o cookie _fbc, o valor de fbc é: fb.1.<timestamp_ms>.<fbclid>"
    function generateFbc() {
        // 1. Tentar pegar do cookie primeiro (prioridade)
        const cookieFbc = getCookie('_fbc');
        if (cookieFbc) return cookieFbc;
        
        // 2. Tentar pegar do storage
        const storedFbc = getStoredValue('_fbc');
        if (storedFbc) return storedFbc;
        
        // 3. Se não tem cookie/_fbc, mas tem fbclid na URL, GERAR o fbc
        const fbclid = getUrlParam('fbclid');
        if (fbclid) {
            const timestamp = Date.now();
            const generatedFbc = `fb.1.${timestamp}.${fbclid}`;
            console.log('[BetiaTracker] fbc gerado a partir do fbclid:', generatedFbc.substring(0, 50) + '...');
            return generatedFbc;
        }
        
        return '';
    }

    // Gerar fingerprint do navegador (dados estáveis que não mudam entre sessões)
    function generateFingerprint() {
        const components = [];
        
        // User Agent (navegador + versão + OS)
        components.push(navigator.userAgent || '');
        
        // Resolução de tela
        components.push(screen.width + 'x' + screen.height);
        
        // Timezone
        try {
            components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
        } catch (e) {
            components.push('');
        }
        
        // Idioma
        components.push(navigator.language || '');
        
        // Plataforma
        components.push(navigator.platform || '');
        
        // Cores da tela
        components.push(screen.colorDepth || '');
        
        // Gerar hash simples do fingerprint
        const fingerprintString = components.join('|');
        
        // Simple hash function (não precisa ser crypto-safe, é só para matching)
        let hash = 0;
        for (let i = 0; i < fingerprintString.length; i++) {
            const char = fingerprintString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(36);
    }

    // Coletar todos os parâmetros de tracking + fingerprint
    function getTrackingParams() {
        return {
            // Visitor ID (do TrackGram)
            vid: getUrlParam('vid') || getStoredValue('visitor_id'),
            
            // Facebook Click ID - AGORA COM GERAÇÃO CORRETA!
            fbc: generateFbc(),
            
            // Facebook Browser ID
            fbp: getUrlParam('fbp') || getCookie('_fbp') || getStoredValue('_fbp'),
            
            // UTMs
            utm_source: getUrlParam('utm_source') || getStoredValue('track_utm_source'),
            utm_medium: getUrlParam('utm_medium') || getStoredValue('track_utm_medium'),
            utm_campaign: getUrlParam('utm_campaign') || getStoredValue('track_utm_campaign'),
            utm_content: getUrlParam('utm_content') || getStoredValue('track_utm_content'),
            utm_term: getUrlParam('utm_term') || getStoredValue('track_utm_term'),
            
            // ======= FINGERPRINT ROBUSTO =======
            // Esses dados ajudam a fazer match mesmo sem visitor_id
            fp: generateFingerprint(), // Hash do fingerprint
            ua: navigator.userAgent || '', // User agent completo
            sr: screen.width + 'x' + screen.height, // Screen resolution
            tz: (function() { 
                try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } 
                catch(e) { return ''; } 
            })(),
            lang: navigator.language || '',
        };
    }

    // Decorar links que apontam para a bet
    function decorateLinks() {
        const trackingParams = getTrackingParams();
        const links = document.querySelectorAll('a');

        links.forEach(function(link) {
            const href = link.getAttribute('href');
            
            // Só decorar links que vão para a bet
            if (href && href.includes(BET_URL_PATTERN)) {
                try {
                    const url = new URL(href, window.location.origin);
                    
                    // Adicionar cada parâmetro se não existir
                    Object.keys(trackingParams).forEach(function(key) {
                        const value = trackingParams[key];
                        if (value && !url.searchParams.has(key)) {
                            url.searchParams.set(key, value);
                        }
                    });

                    // Atualizar o href se mudou
                    if (link.getAttribute('href') !== url.toString()) {
                        link.setAttribute('href', url.toString());
                        console.log('[BetiaTracker] Link decorado com fingerprint:', url.toString().substring(0, 100) + '...');
                    }
                } catch (e) {
                    // URL inválida, ignorar
                }
            }
        });
    }

    // Executar quando o DOM estiver pronto
    function init() {
        // Executar imediatamente
        decorateLinks();

        // Executar novamente após um delay (SPAs, conteúdo dinâmico)
        setTimeout(decorateLinks, 1000);
        setTimeout(decorateLinks, 2000);
        setTimeout(decorateLinks, 3000);

        // Observar mudanças no DOM
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(function() {
                decorateLinks();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        console.log('[BetiaTracker] Inicializado com fingerprint. Parâmetros:', getTrackingParams());
    }

    // Iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
