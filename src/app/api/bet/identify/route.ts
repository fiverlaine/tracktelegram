import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * API Route: /api/bet/identify
 * 
 * Recebe dados de identificação do lead vindos do script injetado na bet.
 * Cria/atualiza o registro na tabela bet_leads para fazer o match email <-> visitor_id.
 * 
 * TAMBÉM dispara evento LEAD para o Facebook CAPI quando tem fbc.
 * 
 * Este endpoint é chamado pelo script que você injeta no <head> da betlionpro.com
 * quando o usuário clica no botão de cadastro.
 */

// CORS headers para permitir chamadas cross-origin da bet
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      email,
      phone,
      visitor_id,
      fbc,
      fbp,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
    } = body;

    // Validação básica
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email é obrigatório" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Supabase client com service role (acesso total)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Capturar IP e User-Agent
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "unknown";
    const userAgent = request.headers.get("user-agent") || "";

    // Upsert: Se o email já existe, atualiza. Senão, cria novo.
    const { data, error } = await supabase
      .from("bet_leads")
      .upsert(
        {
          email: email.toLowerCase().trim(),
          phone: phone || null,
          visitor_id: visitor_id || null,
          fbc: fbc || null,
          fbp: fbp || null,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_content: utm_content || null,
          utm_term: utm_term || null,
          ip_address: ip,
          user_agent: userAgent,
          status: "registered", // Mudou para registered pois está cadastrando
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "email",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      // Se der erro de conflito, tenta update simples
      if (error.code === "23505") {
        await supabase
          .from("bet_leads")
          .update({
            phone: phone || undefined,
            visitor_id: visitor_id || undefined,
            fbc: fbc || undefined,
            fbp: fbp || undefined,
            utm_source: utm_source || undefined,
            utm_medium: utm_medium || undefined,
            utm_campaign: utm_campaign || undefined,
            utm_content: utm_content || undefined,
            utm_term: utm_term || undefined,
            ip_address: ip,
            user_agent: userAgent,
            status: "registered",
          })
          .eq("email", email.toLowerCase().trim());
      } else {
        console.error("Error upserting bet_lead:", error);
      }
    }

    // ========================================
    // ENVIAR EVENTO PARA FACEBOOK CAPI
    // Pixel fixo: Lucas Magnotti
    // ========================================
    let capiSent = false;
    
    if (fbc) {
      // Pixel fixo - Lucas Magnotti
      const PIXEL_ID = "1254338099849797";
      const ACCESS_TOKEN = "EAAkK1oRLUisBQMhcDyobaYzlnZBNODTNWrmVH7FvWTQiHlmZBl7MvRKNvKoJ4uXx17v92TZC88oxDbnU9eZA84zDmyuC2xiTcZCgLXX3h95plBYp7kfRz8Ne0ZBiBuQugGaL3aOVj0HXuaURN17S97ZA0L5ZBLlZBf9ruTS3faC7U40qgtnYxjS9QMpwLxbtqzQZDZD";

      const capiResult = await sendCAPIEvent(
        PIXEL_ID,
        ACCESS_TOKEN,
        "Cadastrou_bet", // Evento personalizado de cadastro na bet
        {
          email: email,
          phone: phone,
          fbc: fbc,
          fbp: fbp,
          ip: ip,
          userAgent: userAgent,
          currency: "BRL",
          value: 0, // Cadastro não tem valor
        }
      );
      
      capiSent = capiResult?.events_received > 0;
      console.log(`[BET IDENTIFY] Cadastrou_bet event sent for ${email}, success: ${capiSent}`);
    } else {
      console.log(`[BET IDENTIFY] No fbc for ${email}, skipping CAPI`);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Lead identificado",
        capi_sent: capiSent,
        event: "Cadastrou_bet"
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error in /api/bet/identify:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
