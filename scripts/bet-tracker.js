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
 * 1. Quando o usuário entra na bet, lê vid/fbc/fbp da URL
 * 2. Salva esses dados no localStorage do domínio da bet
 * 3. Quando o usuário clica em "Criar conta", captura o email e envia
 *    para o seu servidor junto com os dados de tracking
 * 4. Seu servidor faz o match email <-> visitor_id
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

    // Função para pegar parâmetro da URL
    function getUrlParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name) || '';
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

    // Capturar e salvar parâmetros da URL
    function captureUrlParams() {
        const params = ['vid', 'fbc', 'fbp', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        
        params.forEach(function(param) {
            const value = getUrlParam(param);
            if (value) {
                saveToStorage(param, value);
                console.log('[BetTracker] Salvo:', param, '=', value);
            }
        });
    }

    // Obter todos os dados de tracking
    function getTrackingData() {
        return {
            visitor_id: getFromStorage('vid') || getUrlParam('vid'),
            fbc: getFromStorage('fbc') || getUrlParam('fbc'),
            fbp: getFromStorage('fbp') || getUrlParam('fbp'),
            utm_source: getFromStorage('utm_source') || getUrlParam('utm_source'),
            utm_medium: getFromStorage('utm_medium') || getUrlParam('utm_medium'),
            utm_campaign: getFromStorage('utm_campaign') || getUrlParam('utm_campaign'),
            utm_content: getFromStorage('utm_content') || getUrlParam('utm_content'),
            utm_term: getFromStorage('utm_term') || getUrlParam('utm_term'),
        };
    }

    // Enviar dados para o servidor
    function sendIdentification(email, phone) {
        const trackingData = getTrackingData();
        
        // Só enviar se tiver pelo menos visitor_id ou fbc
        if (!trackingData.visitor_id && !trackingData.fbc) {
            console.log('[BetTracker] Sem dados de tracking, não enviando');
            return;
        }

        const payload = {
            email: email,
            phone: phone || '',
            ...trackingData
        };

        console.log('[BetTracker] Enviando identificação:', payload);

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
        console.log('[BetTracker] Inicializando...');
        
        // 1. Capturar parâmetros da URL
        captureUrlParams();
        
        // 2. Configurar listener de cadastro
        setupCadastroListener();
        
        console.log('[BetTracker] Dados de tracking:', getTrackingData());
    }

    // Executar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
