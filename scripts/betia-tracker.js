/**
 * =============================================================
 * SCRIPT PARA: betia.io/codigo/
 * =============================================================
 * 
 * COMO USAR:
 * 1. Cole este script no <head> ou antes do </body> da página betia.io/codigo/
 * 2. Ele vai automaticamente decorar o botão "ACESSAR BETLIONPRO" com os 
 *    parâmetros de tracking (vid, fbc, fbp, utms)
 * 
 * FUNCIONAMENTO:
 * - Lê os parâmetros de tracking do localStorage (salvos quando o usuário
 *   passou pela sua landing page com o script do TrackGram)
 * - Adiciona esses parâmetros na URL do botão que leva para a bet
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

    // Coletar todos os parâmetros de tracking
    function getTrackingParams() {
        return {
            // Visitor ID (do TrackGram)
            vid: getUrlParam('vid') || getStoredValue('visitor_id'),
            
            // Facebook Click ID
            fbc: getUrlParam('fbc') || getCookie('_fbc') || getStoredValue('_fbc'),
            
            // Facebook Browser ID
            fbp: getUrlParam('fbp') || getCookie('_fbp') || getStoredValue('_fbp'),
            
            // UTMs
            utm_source: getUrlParam('utm_source') || getStoredValue('track_utm_source'),
            utm_medium: getUrlParam('utm_medium') || getStoredValue('track_utm_medium'),
            utm_campaign: getUrlParam('utm_campaign') || getStoredValue('track_utm_campaign'),
            utm_content: getUrlParam('utm_content') || getStoredValue('track_utm_content'),
            utm_term: getUrlParam('utm_term') || getStoredValue('track_utm_term'),
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
                        console.log('[BetiaTracker] Link decorado:', url.toString());
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

        console.log('[BetiaTracker] Inicializado. Parâmetros:', getTrackingParams());
    }

    // Iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
