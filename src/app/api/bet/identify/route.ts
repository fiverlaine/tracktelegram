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
    // Novos campos de geolocalização
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    externalId?: string; // visitor_id
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
  
  // Novos campos de geolocalização (hasheados conforme requisito do Facebook)
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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    let {
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
      // ======= NOVOS CAMPOS DE FINGERPRINT =======
      fingerprint,
      user_agent: clientUserAgent,
      screen_resolution,
      timezone,
      language,
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

    // Capturar IP e User-Agent do request
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "unknown";
    const serverUserAgent = request.headers.get("user-agent") || "";
    
    // Usar user_agent do cliente se disponível (mais preciso), senão do servidor
    const userAgent = clientUserAgent || serverUserAgent;

    // Variável para registrar como o match foi feito
    let matchedBy: string | null = null;

    // ========================================
    // MATCHING ROBUSTO COM MÚLTIPLOS CRITÉRIOS
    // Evita falsos positivos de CGNAT/IPs compartilhados
    // ========================================
    if (!visitor_id) {
      console.log(`[BET IDENTIFY] Visitor ID missing, starting multi-criteria matching...`);
      console.log(`[BET IDENTIFY] Fingerprint data:`, { 
        ip: ip !== "unknown" ? ip.substring(0, 10) + "..." : "unknown",
        fingerprint, 
        screen_resolution, 
        timezone,
        userAgent: userAgent ? userAgent.substring(0, 50) + "..." : "none"
      });
      
      // Buscar TODOS os eventos recentes (últimas 24h) com mesmo IP
      const { data: candidateEvents } = await supabase
        .from("events")
        .select("visitor_id, metadata")
        .eq("metadata->>ip_address", ip)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(20); // Pegar vários candidatos para scoring

      if (candidateEvents && candidateEvents.length > 0) {
        console.log(`[BET IDENTIFY] Found ${candidateEvents.length} candidate(s) with matching IP`);
        
        // Sistema de pontuação para cada candidato
        let bestMatch: { visitor_id: string; metadata: any; score: number } | null = null;
        
        for (const event of candidateEvents) {
          const meta = event.metadata || {};
          let score = 1; // 1 ponto por ter o IP igual (já filtrado)
          const matchDetails: string[] = ["ip"];
          
          // User Agent (muito discriminatório - navegador + versão + OS)
          if (userAgent && meta.user_agent) {
            // Comparar apenas a parte principal do UA (sem versões menores)
            const normalizeUA = (ua: string) => ua.toLowerCase().replace(/[0-9]+\.[0-9]+\.[0-9]+/g, 'x.x.x');
            if (normalizeUA(userAgent) === normalizeUA(meta.user_agent)) {
              score += 3;
              matchDetails.push("user_agent");
            }
          }
          
          // Screen Resolution (bastante discriminatório)
          if (screen_resolution && meta.screen_resolution === screen_resolution) {
            score += 2;
            matchDetails.push("screen");
          }
          
          // Timezone (moderadamente discriminatório)
          if (timezone && meta.timezone === timezone) {
            score += 2;
            matchDetails.push("timezone");
          }
          
          // Fingerprint Hash (se disponível, muito preciso)
          if (fingerprint && meta.fingerprint === fingerprint) {
            score += 4;
            matchDetails.push("fingerprint");
          }
          
          // Language
          if (language && meta.language === language) {
            score += 1;
            matchDetails.push("language");
          }
          
          console.log(`[BET IDENTIFY] Candidate ${event.visitor_id.substring(0, 8)}... score: ${score} (${matchDetails.join(" + ")})`);
          
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { visitor_id: event.visitor_id, metadata: meta, score };
          }
        }
        
        // Só aceitar match se tiver score >= 4 (IP + pelo menos mais 2-3 critérios)
        // Isso evita falsos positivos de CGNAT onde só o IP bate
        const MIN_SCORE_THRESHOLD = 4;
        
        if (bestMatch && bestMatch.score >= MIN_SCORE_THRESHOLD) {
          visitor_id = bestMatch.visitor_id;
          matchedBy = `score:${bestMatch.score}`;
          console.log(`[BET IDENTIFY] ✅ MATCH CONFIRMED! visitor_id: ${visitor_id}, score: ${bestMatch.score}`);
          
          // Recuperar outros dados se faltarem
          const meta = bestMatch.metadata;
          if (!fbc && meta.fbc) fbc = meta.fbc;
          if (!fbp && meta.fbp) fbp = meta.fbp;
          if (!utm_source && meta.utm_source) utm_source = meta.utm_source;
          if (!utm_medium && meta.utm_medium) utm_medium = meta.utm_medium;
          if (!utm_campaign && meta.utm_campaign) utm_campaign = meta.utm_campaign;
          if (!utm_content && meta.utm_content) utm_content = meta.utm_content;
          if (!utm_term && meta.utm_term) utm_term = meta.utm_term;
        } else {
          console.log(`[BET IDENTIFY] ❌ No confident match found. Best score: ${bestMatch?.score || 0} (threshold: ${MIN_SCORE_THRESHOLD})`);
        }
      } else {
        console.log(`[BET IDENTIFY] No candidates found for IP: ${ip}`);
      }
    } else {
      matchedBy = "direct";
      console.log(`[BET IDENTIFY] visitor_id provided directly: ${visitor_id}`);
    }

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
    // BUSCAR DADOS ORIGINAIS DA TABELA EVENTS
    // (cidade, estado, país, CEP coletados na presell)
    // ========================================
    let geoData: {
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    } = {};

    if (visitor_id) {
      const { data: originalEvent } = await supabase
        .from("events")
        .select("metadata")
        .eq("visitor_id", visitor_id)
        .not("metadata", "is", null)
        .limit(1)
        .single();

      if (originalEvent?.metadata) {
        const meta = originalEvent.metadata as Record<string, any>;
        geoData = {
          city: meta.city,
          state: meta.region || meta.state,
          country: meta.country,
          postalCode: meta.postal_code,
        };
        console.log(`[BET IDENTIFY] Found geo data from events:`, geoData);

        // Atualizar bet_leads com os dados de geo
        if (geoData.city || geoData.state || geoData.country || geoData.postalCode) {
          await supabase
            .from("bet_leads")
            .update({
              city: geoData.city || undefined,
              state: geoData.state || undefined,
              country: geoData.country || undefined,
              postal_code: geoData.postalCode || undefined,
            })
            .eq("email", email.toLowerCase().trim());
        }
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
          // Dados de geolocalização
          city: geoData.city,
          state: geoData.state,
          country: geoData.country,
          postalCode: geoData.postalCode,
          externalId: visitor_id,
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
        event: "Cadastrou_bet",
        matched_by: matchedBy,
        visitor_id: visitor_id || null,
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
