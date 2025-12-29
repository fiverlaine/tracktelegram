import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";

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
    // Campos de geolocalização
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    externalId?: string; // visitor_id - CRÍTICO para matching (+13%)
  }
) {
  const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;
  
  // Construir user_data conforme documentação Meta CAPI
  const userData: Record<string, any> = {};
  
  // ========================================
  // CAMPOS DE PII (devem ser hasheados)
  // ========================================
  if (eventData.email) {
    userData.em = [hashSHA256(eventData.email.toLowerCase().trim())];
  }
  if (eventData.phone) {
    const cleanPhone = eventData.phone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      userData.ph = [hashSHA256(cleanPhone)];
    }
  }


  // ========================================
  // FBC e FBP - CRÍTICOS PARA MATCHING (+16%)
  // ========================================
  if (eventData.fbc && typeof eventData.fbc === 'string') {
    const fbcTrimmed = eventData.fbc.trim();
    if (fbcTrimmed.startsWith('fb.1.') && fbcTrimmed.length > 20) {
      userData.fbc = fbcTrimmed;
      console.log(`[CAPI] ✅ fbc válido incluído: ${fbcTrimmed.substring(0, 30)}...`);
    } else {
      console.warn(`[CAPI] ⚠️ fbc com formato inválido ignorado: ${fbcTrimmed.substring(0, 30)}`);
    }
  }
  
  if (eventData.fbp && typeof eventData.fbp === 'string') {
    const fbpTrimmed = eventData.fbp.trim();
    if (fbpTrimmed.startsWith('fb.1.') && fbpTrimmed.length > 15) {
      userData.fbp = fbpTrimmed;
      console.log(`[CAPI] ✅ fbp válido incluído: ${fbpTrimmed.substring(0, 30)}...`);
    } else {
      console.warn(`[CAPI] ⚠️ fbp com formato inválido ignorado: ${fbpTrimmed.substring(0, 30)}`);
    }
  }
  
  // IP e User-Agent (não hasheados)
  if (eventData.ip && eventData.ip !== "unknown" && eventData.ip !== "0.0.0.0") {
    userData.client_ip_address = eventData.ip;
  }
  if (eventData.userAgent && eventData.userAgent.length > 10) {
    userData.client_user_agent = eventData.userAgent;
  }
  
  // ========================================
  // GEOLOCALIZAÇÃO (hasheados)
  // ========================================
  if (eventData.city && eventData.city.length > 1) {
    userData.ct = [hashSHA256(eventData.city.toLowerCase().trim())];
  }
  if (eventData.state && eventData.state.length > 1) {
    userData.st = [hashSHA256(eventData.state.toLowerCase().trim())];
  }
  if (eventData.country && eventData.country.length >= 2) {
    userData.country = [hashSHA256(eventData.country.toLowerCase().trim())];
  }
  if (eventData.postalCode) {
    const cleanZip = eventData.postalCode.replace(/\D/g, "");
    if (cleanZip.length >= 5) {
      userData.zp = [hashSHA256(cleanZip)];
    }
  }
  
  // ========================================
  // EXTERNAL_ID - CRÍTICO (+13% EMQ)
  // ========================================
  if (eventData.externalId && eventData.externalId.length > 5) {
    userData.external_id = [hashSHA256(eventData.externalId)];
    console.log(`[CAPI] ✅ external_id incluído (visitor_id): ${eventData.externalId.substring(0, 8)}...`);
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
    // Log detalhado do que está sendo enviado - ajuda a debugar EMQ
    console.log(`[CAPI] ========================================`);
    console.log(`[CAPI] 📊 Enviando evento: ${eventName}`);
    console.log(`[CAPI] 🎯 Pixel: ${pixelId}`);
    console.log(`[CAPI] 💰 Value: ${eventData.value || 0} ${eventData.currency || 'BRL'}`);
    console.log(`[CAPI] 📋 Campos para EMQ (Event Match Quality):`);
    console.log(`[CAPI]   ├─ em (email): ${userData.em ? '✅' : '❌'}`);
    console.log(`[CAPI]   ├─ ph (phone): ${userData.ph ? '✅' : '❌'}`);
    console.log(`[CAPI]   ├─ fbc (+16% EMQ): ${userData.fbc ? '✅ ' + userData.fbc.substring(0, 25) + '...' : '❌ AUSENTE'}`);
    console.log(`[CAPI]   ├─ fbp: ${userData.fbp ? '✅ ' + userData.fbp.substring(0, 25) + '...' : '❌ AUSENTE'}`);
    console.log(`[CAPI]   ├─ external_id (+13% EMQ): ${userData.external_id ? '✅' : '❌ AUSENTE'}`);
    console.log(`[CAPI]   ├─ client_ip: ${userData.client_ip_address ? '✅' : '❌'}`);
    console.log(`[CAPI]   ├─ client_ua: ${userData.client_user_agent ? '✅' : '❌'}`);
    console.log(`[CAPI]   ├─ ct (city): ${userData.ct ? '✅' : '❌'}`);
    console.log(`[CAPI]   ├─ st (state): ${userData.st ? '✅' : '❌'}`);
    console.log(`[CAPI]   ├─ country: ${userData.country ? '✅' : '❌'}`);
    console.log(`[CAPI]   └─ zp (zip): ${userData.zp ? '✅' : '❌'}`);
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

    // ========================================
    // BUSCAR LEAD EM TODAS AS TABELAS (ordem de prioridade)
    // ========================================
    // 1. Pedro Zutti (tabela dedicada)
    // 2. Lucas Magnotti (tabela dedicada - NOVA)
    // 3. bet_leads (afiliados desconhecidos - NÃO envia CAPI)
    
    let lead = null;
    let targetTable: string = "";
    let pixelConfig: { pixelId: string; accessToken: string } | null = null;
    
    // 1. Tentar encontrar na Tabela Pedro Zutti
    const { data: leadPedro } = await supabase
      .from("bet_leads_pedrozutti")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (leadPedro) {
        lead = leadPedro;
        targetTable = "bet_leads_pedrozutti";
        pixelConfig = {
            pixelId: "1217675423556541", 
            accessToken: "EAAb7wyx9POsBQZA6xqf8Wc49ZAUjhqZAWv8zdjgBqebt7nHoNCKTZCZAbttOGxUsuWNQfnrYjqjs47aZAwWWlFJ7FmxtZC2ct2CH5fhGINNwGtBQoWGwYGZAwa2Tz3z43hlkZBkynZCQi6QsvITiaITkxxRQDozwX0ZBmEUFHuWLEwRdMfWM3Ts2ZBss5MrZCYsl7OgZDZD"
        };
        console.log(`[BET WEBHOOK] Lead encontrado na tabela Pedro Zutti: ${email}`);
    } else {
        // 2. Tentar na Tabela Lucas Magnotti
        const { data: leadLucas } = await supabase
          .from("bet_leads_lucasmagnotti")
          .select("*")
          .eq("email", email.toLowerCase().trim())
          .single();
        
        if (leadLucas) {
            lead = leadLucas;
            targetTable = "bet_leads_lucasmagnotti";
            pixelConfig = {
                pixelId: "1254338099849797",
                accessToken: "EAAkK1oRLUisBQMhcDyobaYzlnZBNODTNWrmVH7FvWTQiHlmZBl7MvRKNvKoJ4uXx17v92TZC88oxDbnU9eZA84zDmyuC2xiTcZCgLXX3h95plBYp7kfRz8Ne0ZBiBuQugGaL3aOVj0HXuaURN17S97ZA0L5ZBLlZBf9ruTS3faC7U40qgtnYxjS9QMpwLxbtqzQZDZD"
            };
            console.log(`[BET WEBHOOK] Lead encontrado na tabela Lucas Magnotti: ${email}`);
        } else {
            // 3. Tentar na Tabela Padrão (afiliados desconhecidos)
            const { data: leadUnknown } = await supabase
              .from("bet_leads")
              .select("*")
              .eq("email", email.toLowerCase().trim())
              .single();
            
            if (leadUnknown) {
                lead = leadUnknown;
                targetTable = "bet_leads";
                pixelConfig = null; // NÃO envia CAPI para funis desconhecidos!
                console.log(`[BET WEBHOOK] ⚠️ Lead encontrado na tabela PADRÃO (afiliado desconhecido): ${email} - CAPI desabilitado`);
            }
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

      let capiSent = false;

      // SÓ envia CAPI se:
      // 1. pixelConfig existe (funil conhecido - Lucas ou Pedro)
      // 2. Tem fbc OU é depósito
      // Funis desconhecidos (afiliados) NÃO enviam CAPI
      if (pixelConfig && (lead.fbc || isDeposit)) {
        const capiResult = await sendCAPIEvent(
          pixelConfig.pixelId,
          pixelConfig.accessToken,
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
      } else if (!pixelConfig) {
        console.log(`[BET WEBHOOK] ⚠️ CAPI não enviado - funil desconhecido (tabela: ${targetTable})`);
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
