/**
 * Pushcut Integration Library
 * 
 * Biblioteca para enviar notificações push via Pushcut API
 * Documentação: https://www.pushcut.io/help
 */

const PUSHCUT_API_BASE = 'https://api.pushcut.io/v1';

// Tipos de eventos suportados
export type PushcutEventType = 
    | 'new_lead' 
    | 'member_join' 
    | 'member_leave' 
    | 'pageview' 
    | 'click' 
    | 'join_request';

// Mapeamento de eventos para nomes amigáveis
export const EVENT_LABELS: Record<PushcutEventType, string> = {
    new_lead: 'Novo Lead',
    member_join: 'Membro Entrou',
    member_leave: 'Membro Saiu',
    pageview: 'Pageview',
    click: 'Click',
    join_request: 'Solicitação de Entrada'
};

// Variáveis disponíveis para templates
export const TEMPLATE_VARIABLES: Record<PushcutEventType, string[]> = {
    new_lead: ['{username}', '{name}', '{channel}', '{funnel}', '{date}', '{time}'],
    member_join: ['{username}', '{name}', '{user_id}', '{channel}', '{funnel}', '{date}', '{time}'],
    member_leave: ['{username}', '{name}', '{user_id}', '{channel}', '{funnel}', '{date}', '{time}'],
    pageview: ['{visitor_id}', '{page_url}', '{funnel}', '{source}', '{date}', '{time}'],
    click: ['{visitor_id}', '{page_url}', '{funnel}', '{source}', '{date}', '{time}'],
    join_request: ['{username}', '{name}', '{user_id}', '{channel}', '{funnel}', '{date}', '{time}']
};

// Templates padrão para cada evento
export const DEFAULT_TEMPLATES: Record<PushcutEventType, { title: string; text: string }> = {
    new_lead: {
        title: '🎉 Novo Lead no TrackGram!',
        text: '{name} ({username}) entrou no canal {channel} via funil {funnel}'
    },
    member_join: {
        title: '✅ Novo Membro',
        text: '{name} ({username}) entrou no canal {channel}'
    },
    member_leave: {
        title: '👋 Membro Saiu',
        text: '{name} ({username}) saiu do canal {channel}'
    },
    pageview: {
        title: '👀 Nova Visualização',
        text: 'Página visualizada no funil {funnel}'
    },
    click: {
        title: '🖱️ Novo Click',
        text: 'Click registrado no funil {funnel}'
    },
    join_request: {
        title: '📩 Solicitação de Entrada',
        text: '{name} ({username}) solicitou entrada no canal {channel}'
    }
};

// Interface para dados do evento
export interface PushcutEventData {
    username?: string;
    name?: string;
    user_id?: string;
    channel?: string;
    funnel?: string;
    visitor_id?: string;
    page_url?: string;
    source?: string;
    [key: string]: string | undefined;
}

// Interface para configuração de notificação
export interface PushcutNotificationConfig {
    apiKey: string;
    notificationName: string;
    title: string;
    text: string;
    devices?: string[];
    sound?: string;
}

// Interface para resposta da API
export interface PushcutResponse {
    success: boolean;
    id?: string;
    error?: string;
}

/**
 * Substitui variáveis de template pelos valores reais
 */
export function parseTemplate(template: string, data: PushcutEventData): string {
    let result = template;
    
    // Adiciona date e time automaticamente
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const allData = {
        ...data,
        date: dateStr,
        time: timeStr
    };
    
    Object.entries(allData).forEach(([key, value]) => {
        // Substituir {chave} pelo valor
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
    });

    // Limpar variáveis não utilizadas que ficaram vazias
    // result = result.replace(/\{.*?\}/g, '');
    
    return result;
}

/**
 * Envia uma notificação via Pushcut API
 */
export async function sendPushcutNotification(config: PushcutNotificationConfig): Promise<PushcutResponse> {
    try {
        const url = `${PUSHCUT_API_BASE}/notifications/${encodeURIComponent(config.notificationName)}`;
        
        const body: Record<string, any> = {
            title: config.title,
            text: config.text
        };
        
        if (config.devices && config.devices.length > 0) {
            body.devices = config.devices;
        }
        
        if (config.sound) {
            body.sound = config.sound;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'API-Key': config.apiKey
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Pushcut] API Error:', response.status, errorText);
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText}`
            };
        }
        
        const data = await response.json();
        
        return {
            success: true,
            id: data.id || data.notificationId
        };
        
    } catch (error) {
        console.error('[Pushcut] Error sending notification:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Testa a conexão com a API do Pushcut
 */
export async function testPushcutConnection(apiKey: string): Promise<{ success: boolean; devices?: string[]; error?: string }> {
    try {
        const response = await fetch(`${PUSHCUT_API_BASE}/devices`, {
            method: 'GET',
            headers: {
                'API-Key': apiKey
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: 'API Key inválida' };
            }
            return { success: false, error: `Erro HTTP ${response.status}` };
        }
        
        const devices = await response.json();
        return {
            success: true,
            devices: devices.map((d: any) => d.id)
        };
        
    } catch (error) {
        console.error('[Pushcut] Test connection error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro de conexão'
        };
    }
}

/**
 * Lista as notificações configuradas no Pushcut
 */
export async function listPushcutNotifications(apiKey: string): Promise<{ success: boolean; notifications?: Array<{ id: string; title: string }>; error?: string }> {
    try {
        const response = await fetch(`${PUSHCUT_API_BASE}/notifications`, {
            method: 'GET',
            headers: {
                'API-Key': apiKey
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: 'API Key inválida' };
            }
            return { success: false, error: `Erro HTTP ${response.status}` };
        }
        
        const notifications = await response.json();
        return {
            success: true,
            notifications
        };
        
    } catch (error) {
        console.error('[Pushcut] List notifications error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro de conexão'
        };
    }
}
