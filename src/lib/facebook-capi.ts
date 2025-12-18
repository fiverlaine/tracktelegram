"use server";

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

/**
 * Cria cliente Supabase para logs
 */
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseKey);
}

/**
 * Hash SHA256 para external_id (conforme documentação Meta)
 */
function hashSHA256(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
}

interface CAPIUserData {
    fbc?: string | null;
    fbp?: string | null;
    user_agent?: string;
    email?: string;
    ip_address?: string;
    external_id?: string;
    ct?: string; // City (SHA256)
    st?: string; // State (SHA256)
    zp?: string; // Zip (SHA256)
    country?: string; // Country (SHA256)
}

interface CAPICustomData {
    currency?: string;
    value?: number;
    content_name?: string;
}

interface CAPILogData {
    visitor_id?: string;
    funnel_id?: string;
    event_name: string;
    pixel_id: string;
    status: "success" | "error" | "skipped";
    request_payload?: any;
    response_payload?: any;
    error_message?: string;
}

/**
 * Salva log de envio CAPI no Supabase
 */
async function logCAPIEvent(data: CAPILogData) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error("[CAPI Log] ❌ Supabase client não disponível - verifique variáveis de ambiente");
            return;
        }

        const { error } = await supabase.from("capi_logs").insert({
            visitor_id: data.visitor_id,
            funnel_id: data.funnel_id,
            event_name: data.event_name,
            pixel_id: data.pixel_id,
            status: data.status,
            request_payload: data.request_payload,
            response_payload: data.response_payload,
            error_message: data.error_message
        }).select();

        if (error) {
            console.error("[CAPI Log] ❌ Erro ao inserir log:", error.message, error.details);
        } else {
            console.log("[CAPI Log] ✅ Log salvo com sucesso");
        }
    } catch (e) {
        console.error("[CAPI Log] ❌ Erro inesperado ao salvar log:", e);
    }
}

/**
 * Envia evento para Facebook CAPI usando fetch direto
 * Mais confiável em ambiente serverless do que o SDK
 */
export async function sendCAPIEvent(
    accessToken: string,
    pixelId: string,
    eventName: string,
    userDataPayload: CAPIUserData,
    customDataPayload?: CAPICustomData,
    metadata?: {
        visitor_id?: string;
        funnel_id?: string;
    }
) {
    const logData: CAPILogData = {
        visitor_id: metadata?.visitor_id,
        funnel_id: metadata?.funnel_id,
        event_name: eventName,
        pixel_id: pixelId,
        status: "skipped"
    };

    // Validação inicial
    if (!accessToken || !pixelId) {
        console.warn("[CAPI] Missing Access Token or Pixel ID");
        logData.status = "skipped";
        logData.error_message = "Missing Access Token or Pixel ID";
        await logCAPIEvent(logData);
        return null;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const eventId = `${eventName.toLowerCase()}_${currentTimestamp}_${metadata?.visitor_id?.substring(0, 8) || "unknown"}`;

    // Construir user_data conforme documentação Meta
    const userData: Record<string, any> = {};

    // fbc e fbp são críticos para Event Match Quality - incluir sempre que disponíveis
    // Verificar se não é null/undefined e se é uma string não vazia
    if (userDataPayload.fbc !== null && userDataPayload.fbc !== undefined && String(userDataPayload.fbc).trim() !== '') {
        userData.fbc = String(userDataPayload.fbc).trim();
        console.log(`[CAPI] ✅ fbc incluído: ${userData.fbc.substring(0, 20)}...`);
    } else {
        console.warn(`[CAPI] ⚠️ fbc não disponível ou inválido:`, userDataPayload.fbc);
    }
    
    if (userDataPayload.fbp !== null && userDataPayload.fbp !== undefined && String(userDataPayload.fbp).trim() !== '') {
        userData.fbp = String(userDataPayload.fbp).trim();
        console.log(`[CAPI] ✅ fbp incluído: ${userData.fbp.substring(0, 20)}...`);
    } else {
        console.warn(`[CAPI] ⚠️ fbp não disponível ou inválido:`, userDataPayload.fbp);
    }
    if (userDataPayload.user_agent) {
        userData.client_user_agent = userDataPayload.user_agent;
    }
    if (userDataPayload.ip_address && userDataPayload.ip_address !== "0.0.0.0") {
        userData.client_ip_address = userDataPayload.ip_address;
    }
    if (userDataPayload.external_id) {
        // external_id deve ser hasheado conforme documentação
        userData.external_id = hashSHA256(userDataPayload.external_id);
    }

    // Geolocation fields - Meta requires them to be hashed (lowercase + sha256)
    if (userDataPayload.ct) {
        userData.ct = hashSHA256(userDataPayload.ct.toLowerCase().trim());
    }
    if (userDataPayload.st) {
        userData.st = hashSHA256(userDataPayload.st.toLowerCase().trim());
    }
    if (userDataPayload.zp) {
        userData.zp = hashSHA256(userDataPayload.zp.toLowerCase().trim());
    }
    if (userDataPayload.country) {
        userData.country = hashSHA256(userDataPayload.country.toLowerCase().trim());
    }

    // Construir custom_data
    const customData: Record<string, any> = {};
    if (customDataPayload?.content_name) {
        customData.content_name = customDataPayload.content_name;
    }
    if (customDataPayload?.currency) {
        customData.currency = customDataPayload.currency;
    }
    if (customDataPayload?.value !== undefined) {
        customData.value = customDataPayload.value;
    }

    // Construir payload do evento
    const eventPayload = {
        data: [
            {
                event_name: eventName,
                event_time: currentTimestamp,
                event_id: eventId,
                action_source: "website",
                user_data: userData,
                ...(Object.keys(customData).length > 0 && { custom_data: customData })
            }
        ]
    };

    logData.request_payload = eventPayload;

    // URL da API do Facebook
    const apiVersion = "v18.0";
    const url = `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${accessToken}`;



    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(eventPayload)
        });

        const result = await response.json();
        logData.response_payload = result;

        if (result.events_received && result.events_received > 0) {
            console.log(`[CAPI] ✅ Sucesso! events_received: ${result.events_received}, fbtrace_id: ${result.fbtrace_id}`);
            logData.status = "success";
            await logCAPIEvent(logData);
            return result;
        } else if (result.error) {
            console.error(`[CAPI] ❌ Erro do Facebook:`, result.error);
            logData.status = "error";
            logData.error_message = result.error.message || JSON.stringify(result.error);
            await logCAPIEvent(logData);
            return null;
        } else {
            console.warn(`[CAPI] ⚠️ Resposta inesperada:`, result);
            logData.status = "error";
            logData.error_message = "Resposta inesperada: " + JSON.stringify(result);
            await logCAPIEvent(logData);
            return null;
        }
    } catch (error: any) {
        console.error(`[CAPI] ❌ Erro de rede:`, error);
        logData.status = "error";
        logData.error_message = error.message || String(error);
        await logCAPIEvent(logData);
        throw error;
    }
}
