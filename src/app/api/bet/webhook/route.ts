import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * API Route: /api/bet/webhook
 * 
 * Recebe webhooks da bet (cadastro e depósito).
 * Faz o match pelo email e dispara eventos para o Facebook CAPI.
 * 
 * Eventos disparados:
 * - Cadastro (sem valor): Lead
 * - Depósito (com valor): Purchase
 * 
 * Formatos esperados (baseado no arquivo betliom.txt):
 * 
 * Cadastro:
 * { name: "", phone: "38183813939", email: "ryanteste813@gmail.com" }
 * 
 * Depósito:
 * { name: "", phone: "89274994628", email: "lulaladrao@ehdim.com", 
 *   valor: 30, qrcode: "", currency: "BRL", status: "PAID", transaction_status: "completed" }
 */

// Hash SHA256 para dados do usuário (requisito do Facebook CAPI)
function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// Enviar evento para Facebook CAPI
async function sendCAPIEvent(
  pixelId: string,
  accessToken: string,
  eventName: string,
  eventData: {
    email?: string;
    phone?: string;
    fbc?: string;
    fbp?: string;
    ip?: string;
    userAgent?: string;
    currency?: string;
    value?: number;
    eventSourceUrl?: string;
    // Novos campos de geolocalização
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    externalId?: string;
  }
) {
  const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;
  
  // Construir user_data removendo campos undefined
  const userData: Record<string, any> = {};
  
  if (eventData.email) {
    userData.em = [hashSHA256(eventData.email.toLowerCase().trim())];
  }
  if (eventData.phone) {
    userData.ph = [hashSHA256(eventData.phone.replace(/\D/g, ""))];
  }
  if (eventData.fbc) {
    userData.fbc = eventData.fbc;
  }
  if (eventData.fbp) {
    userData.fbp = eventData.fbp;
  }
  if (eventData.ip && eventData.ip !== "unknown") {
    userData.client_ip_address = eventData.ip;
  }
  if (eventData.userAgent) {
    userData.client_user_agent = eventData.userAgent;
  }
  
  // Campos de geolocalização (hasheados)
  if (eventData.city) {
    userData.ct = [hashSHA256(eventData.city.toLowerCase().trim())];
  }
  if (eventData.state) {
    userData.st = [hashSHA256(eventData.state.toLowerCase().trim())];
  }
  if (eventData.country) {
    userData.country = [hashSHA256(eventData.country.toLowerCase().trim())];
  }
  if (eventData.postalCode) {
    userData.zp = [hashSHA256(eventData.postalCode.replace(/\D/g, ""))];
  }
  if (eventData.externalId) {
    userData.external_id = [hashSHA256(eventData.externalId)];
  }

  const payload: Record<string, any> = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: eventData.eventSourceUrl || "https://betlionpro.com",
        user_data: userData,
        custom_data: {
          currency: eventData.currency || "BRL",
          value: eventData.value || 0,
        },
      },
    ],
    access_token: accessToken,
  };

  // Adicionar test_event_code se existir (para debug no Facebook Events Manager)
  if (process.env.FB_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.FB_TEST_EVENT_CODE;
  }

  try {
    // Log detalhado do que está sendo enviado
    console.log(`[CAPI] ========================================`);
    console.log(`[CAPI] Sending ${eventName} event`);
    console.log(`[CAPI] Pixel: ${pixelId}`);
    console.log(`[CAPI] User Data (raw):`, {
      email: eventData.email,
      phone: eventData.phone,
      fbc: eventData.fbc ? "✓ presente" : "✗ ausente",
      fbp: eventData.fbp ? "✓ presente" : "✗ ausente",
      ip: eventData.ip,
      city: eventData.city || "✗ ausente",
      state: eventData.state || "✗ ausente",
      country: eventData.country || "✗ ausente",
      postalCode: eventData.postalCode || "✗ ausente",
      externalId: eventData.externalId ? "✓ presente" : "✗ ausente",
    });
    console.log(`[CAPI] Custom Data:`, {
      currency: eventData.currency || "BRL",
      value: eventData.value || 0,
    });
    console.log(`[CAPI] ========================================`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    
    console.log(`[CAPI] Response:`, JSON.stringify(result));
    
    if (result.error) {
      console.error(`[CAPI] ERROR:`, result.error);
    } else {
      console.log(`[CAPI] SUCCESS: ${result.events_received} event(s) received`);
    }
    
    return result;
  } catch (error) {
    console.error("[CAPI] Error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Tentar ler o body como texto primeiro para debug
    const rawBody = await request.text();
    console.log("[BET WEBHOOK] Raw body received:", rawBody);
    
    if (!rawBody || rawBody.trim() === "") {
      console.error("[BET WEBHOOK] Empty body received");
      return NextResponse.json(
        { success: false, error: "Body vazio recebido" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[BET WEBHOOK] JSON parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "JSON inválido", raw: rawBody.substring(0, 200) },
        { status: 400 }
      );
    }
    
    console.log("[BET WEBHOOK] Parsed body:", JSON.stringify(body));
    
    // Extrair dados do webhook (pode vir como array ou objeto, ou direto)
    let webhookData = body;
    
    // Se vier como array (formato N8N)
    if (Array.isArray(body)) {
      webhookData = body[0]?.body || body[0];
    }
    // Se vier com wrapper .body
    else if (body.body && typeof body.body === 'object') {
      webhookData = body.body;
    }
    
    console.log("[BET WEBHOOK] Extracted data:", JSON.stringify(webhookData));
    
    const { email, phone, name, valor, status, transaction_status, currency } = webhookData || {};

    if (!email) {
      console.error("[BET WEBHOOK] Email not found in:", JSON.stringify(webhookData));
      return NextResponse.json(
        { success: false, error: "Email não encontrado no webhook", received: webhookData },
        { status: 400 }
      );
    }

    // Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Tentar encontrar na Tabela Pedro Zutti
    let lead = null;
    let targetTable = "bet_leads_pedrozutti";
    let pixelConfig = {
        pixelId: "1217675423556541", 
        accessToken: "EAAb7wyx9POsBQZA6xqf8Wc49ZAUjhqZAWv8zdjgBqebt7nHoNCKTZCZAbttOGxUsuWNQfnrYjqjs47aZAwWWlFJ7FmxtZC2ct2CH5fhGINNwGtBQoWGwYGZAwa2Tz3z43hlkZBkynZCQi6QsvITiaITkxxRQDozwX0ZBmEUFHuWLEwRdMfWM3Ts2ZBss5MrZCYsl7OgZDZD"
    };

    const { data: leadPedro } = await supabase
      .from("bet_leads_pedrozutti")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (leadPedro) {
        lead = leadPedro;
        console.log(`[BET WEBHOOK] Lead encontrado na tabela Pedro Zutti: ${email}`);
    } else {
        // 2. Se não achou, tentar na Tabela Padrão (Lucas)
        const { data: leadLucas } = await supabase
          .from("bet_leads")
          .select("*")
          .eq("email", email.toLowerCase().trim())
          .single();
        
        if (leadLucas) {
            lead = leadLucas;
            targetTable = "bet_leads";
            pixelConfig = {
                pixelId: "1254338099849797",
                accessToken: "EAAkK1oRLUisBQMhcDyobaYzlnZBNODTNWrmVH7FvWTQiHlmZBl7MvRKNvKoJ4uXx17v92TZC88oxDbnU9eZA84zDmyuC2xiTcZCgLXX3h95plBYp7kfRz8Ne0ZBiBuQugGaL3aOVj0HXuaURN17S97ZA0L5ZBLlZBf9ruTS3faC7U40qgtnYxjS9QMpwLxbtqzQZDZD"
            };
            console.log(`[BET WEBHOOK] Lead encontrado na tabela Padrão (Lucas): ${email}`);
        }
    }

    // Determinar tipo de evento
    // É depósito se tiver valor E status PAID/completed
    const isDeposit = valor !== undefined && valor > 0 && 
      (status === "PAID" || transaction_status === "completed");
    
    const eventType = isDeposit ? "deposit" : "register";
    const fbEventName = isDeposit ? "Purchase" : "Cadastrou_bet";

    console.log(`[BET WEBHOOK] Event type: ${eventType}, FB Event: ${fbEventName}, valor: ${valor}`);

    // Se encontrou o lead (em qualquer tabela), temos os dados de tracking
    if (lead) {
      // Atualizar status do lead na tabela correta
      const updateData: Record<string, any> = {
        status: isDeposit ? "deposited" : "registered",
        updated_at: new Date().toISOString(),
      };

      if (isDeposit) {
        updateData.deposit_value = valor;
        updateData.deposit_at = new Date().toISOString();
      }

      if (phone && !lead.phone) {
        updateData.phone = phone;
      }

      await supabase
        .from(targetTable) // Tabela dinâmica
        .update(updateData)
        .eq("id", lead.id);

      // Usar config dinâmica
      const PIXEL_ID = pixelConfig.pixelId;
      const ACCESS_TOKEN = pixelConfig.accessToken;

      let capiSent = false;

      // Enviar para CAPI se tiver fbc OU é depósito
      // Para depósito, enviamos mesmo sem fbc (usando email hash)
      if (lead.fbc || isDeposit) {
        const capiResult = await sendCAPIEvent(
          PIXEL_ID,
          ACCESS_TOKEN,
          fbEventName,
          {
            email: email,
            phone: phone || lead.phone,
            fbc: lead.fbc || undefined,
            fbp: lead.fbp || undefined,
            ip: lead.ip_address || undefined,
            userAgent: lead.user_agent || undefined,
            currency: currency || "BRL",
            value: isDeposit ? Number(valor) : 0,
            // Dados de geolocalização do lead
            city: lead.city || undefined,
            state: lead.state || undefined,
            country: lead.country || undefined,
            postalCode: lead.postal_code || undefined,
            externalId: lead.visitor_id || undefined,
          }
        );

        capiSent = capiResult?.events_received > 0;
        console.log(`[BET WEBHOOK] ${fbEventName} event sent for ${email}, success: ${capiSent}`);
      } else {
        console.log(`[BET WEBHOOK] Skipping CAPI - no fbc and not a deposit`);
      }

      return NextResponse.json({
        success: true,
        message: `Evento ${eventType} processado`,
        matched: true,
        lead_id: lead.id,
        table: targetTable,
        capi_sent: capiSent,
        fb_event: fbEventName,
        value: isDeposit ? valor : 0,
      });

    } else {
      // Lead não encontrado - salvar na tabela PADRÃO (Lucas) como fallback
      // Ou na Pedro se preferir, mas padrão é mais seguro.
      const { data: newLead } = await supabase
        .from("bet_leads")
        .insert({
          email: email.toLowerCase().trim(),
          phone: phone || null,
          status: isDeposit ? "deposited" : "registered",
          deposit_value: isDeposit ? valor : null,
          deposit_at: isDeposit ? new Date().toISOString() : null,
        })
        .select()
        .single();

      console.log(`[BET WEBHOOK] Lead ${email} não tinha tracking prévio, salvo em bet_leads (fallback)`);

      // Tentar enviar CAPI para Lucas (Fallback)
      const PIXEL_ID = "1254338099849797";
      const ACCESS_TOKEN = "EAAkK1oRLUisBQMhcDyobaYzlnZBNODTNWrmVH7FvWTQiHlmZBl7MvRKNvKoJ4uXx17v92TZC88oxDbnU9eZA84zDmyuC2xiTcZCgLXX3h95plBYp7kfRz8Ne0ZBiBuQugGaL3aOVj0HXuaURN17S97ZA0L5ZBLlZBf9ruTS3faC7U40qgtnYxjS9QMpwLxbtqzQZDZD";
      
      let capiSent = false;
      if (isDeposit) {
        const capiResult = await sendCAPIEvent(
          PIXEL_ID,
          ACCESS_TOKEN,
          "Purchase",
          {
            email: email,
            phone: phone,
            currency: currency || "BRL",
            value: Number(valor),
          }
        );
        capiSent = capiResult?.events_received > 0;
        console.log(`[BET WEBHOOK] Purchase sent for untracked lead ${email}, success: ${capiSent}`);
      }

      return NextResponse.json({
        success: true,
        message: `Evento ${eventType} salvo (sem tracking prévio)`,
        matched: false,
        lead_id: newLead?.id,
        capi_sent: capiSent,
        fb_event: isDeposit ? "Purchase" : null,
        value: isDeposit ? valor : 0,
      });
    }

  } catch (error) {
    console.error("Error in /api/bet/webhook:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET para verificar se o endpoint está funcionando
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Bet webhook endpoint is active",
    events: {
      register: "Sends Lead event to Facebook CAPI",
      deposit: "Sends Purchase event with value to Facebook CAPI",
    },
    usage: "POST with { email, phone, valor?, status?, transaction_status?, currency? }",
  });
}
