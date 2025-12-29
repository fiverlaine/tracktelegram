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
  // https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
  const userData: Record<string, any> = {};
  
  // ========================================
  // CAMPOS DE PII (devem ser hasheados)
  // ========================================
  if (eventData.email) {
    // Email: lowercase, trim, hash SHA256
    userData.em = [hashSHA256(eventData.email.toLowerCase().trim())];
  }
  if (eventData.phone) {
    // Phone: apenas dígitos, hash SHA256
    const cleanPhone = eventData.phone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      userData.ph = [hashSHA256(cleanPhone)];
    }
  }


  // ========================================
  // FBC e FBP - CRÍTICOS PARA MATCHING (+16%)
  // NÃO hashear - são identificadores técnicos
  // ========================================
  // Validar formato do fbc: deve começar com "fb.1." e ter o fbclid
  if (eventData.fbc && typeof eventData.fbc === 'string') {
    const fbcTrimmed = eventData.fbc.trim();
    // Formato válido: fb.1.<timestamp>.<fbclid>
    if (fbcTrimmed.startsWith('fb.1.') && fbcTrimmed.length > 20) {
      userData.fbc = fbcTrimmed;
      console.log(`[CAPI] ✅ fbc válido incluído: ${fbcTrimmed.substring(0, 30)}...`);
    } else {
      console.warn(`[CAPI] ⚠️ fbc com formato inválido ignorado: ${fbcTrimmed.substring(0, 30)}`);
    }
  }
  
  // Validar formato do fbp: deve começar com "fb.1."
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
  // GEOLOCALIZAÇÃO (hasheados, lowercase)
  // ========================================
  if (eventData.city && eventData.city.length > 1) {
    userData.ct = [hashSHA256(eventData.city.toLowerCase().trim())];
  }
  if (eventData.state && eventData.state.length > 1) {
    userData.st = [hashSHA256(eventData.state.toLowerCase().trim())];
  }
  if (eventData.country && eventData.country.length >= 2) {
    // Country code deve ser ISO 3166-1 alpha-2 (ex: "br", "us")
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
  // Deve ser STRING hasheada (não array!)
  // ========================================
  if (eventData.externalId && eventData.externalId.length > 5) {
    // Conforme documentação: external_id como string única hasheada
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
    
    // console.log(`[CAPI] Response:`, JSON.stringify(result));
    
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
      funnel_id, // Novo parâmetro customizado para roteamento
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
    
    // GeoIP Fallback (Vercel Headers)
    const vercelCity = request.headers.get("x-vercel-ip-city");
    const vercelRegion = request.headers.get("x-vercel-ip-country-region");
    const vercelCountry = request.headers.get("x-vercel-ip-country");

    // Usar user_agent do cliente se disponível (mais preciso), senão do servidor
    const userAgent = clientUserAgent || serverUserAgent;

    // Variável para registrar como o match foi feito
    let matchedBy: string | null = null;
    let matchedEvent: any = null;

    // ========================================
    // MATCHING ROBUSTO COM MÚLTIPLOS CRITÉRIOS
    // ========================================
    
    // Helper para extrair info básica do UA
    const parseUA = (ua: string) => {
      ua = ua || "";
      let os = "unknown";
      let version = "";
      let device = "unknown";

      if (ua.includes("iPhone OS")) {
        os = "iOS";
        const match = ua.match(/iPhone OS ([0-9_]+)/);
        if (match) version = match[1].replace(/_/g, ".");
        device = "iPhone";
      } else if (ua.includes("Android")) {
        os = "Android";
        const match = ua.match(/Android ([0-9.]+)/);
        if (match) version = match[1];
        // Tentar pegar modelo (ex: SM-A065M)
        const modelMatch = ua.match(/; ([^;]+) Build\//);
        if (modelMatch) device = modelMatch[1].trim();
      } else if (ua.includes("Windows")) {
        os = "Windows";
      } else if (ua.includes("Mac OS")) {
        os = "MacOS";
      }

      return { os, version, device };
    };

    if (!visitor_id) {
    //   console.log(`[BET IDENTIFY] Visitor ID missing. IP: ${ip}`);
      
      // 1. TENTATIVA POR IP (Prioridade Alta)
      if (ip !== "unknown") {
        const { data: ipEvents } = await supabase
          .from("events")
          .select("visitor_id, metadata")
          .eq("metadata->>ip_address", ip)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(5);

        if (ipEvents && ipEvents.length > 0) {
           const match = ipEvents[0];
           visitor_id = match.visitor_id;
           matchedBy = "ip_address";
           matchedEvent = match;
           // console.log(`[BET IDENTIFY] ✅ Match by IP: ${visitor_id}`);
        }
      }

      // 2. TENTATIVA FUZZY (Fallback se IP falhou)
      // Busca eventos recentes (1h) e compara OS/Device
      if (!visitor_id) {
        // console.log(`[BET IDENTIFY] IP match failed. Trying Fuzzy UA match...`);
        
        const clientUA = parseUA(userAgent);
        
        if (clientUA.os !== "unknown") {
          // Buscar últimos 50 eventos
          const { data: recentEvents } = await supabase
            .from("events")
            .select("visitor_id, metadata, created_at")
            .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Última 1h
            .order("created_at", { ascending: false })
            .limit(50);

          if (recentEvents && recentEvents.length > 0) {
            let bestFuzzyMatch = null;

            for (const event of recentEvents) {
              const eventUAStr = event.metadata?.user_agent || "";
              const eventUA = parseUA(eventUAStr);
              
              let isMatch = false;

              if (clientUA.os === eventUA.os) {
                const clientMajor = clientUA.version.split(".")[0];
                const eventMajor = eventUA.version.split(".")[0];
                
                if (clientMajor === eventMajor) {
                  if (clientUA.os === "Android") {
                    if (clientUA.device === eventUA.device && clientUA.device !== "unknown") isMatch = true;
                  } else if (clientUA.os === "iOS") {
                    isMatch = true;
                  }
                }
              }

              if (isMatch) {
                bestFuzzyMatch = event;
                break; // Pegamos o mais recente que bateu
              }
            }

            if (bestFuzzyMatch) {
              visitor_id = bestFuzzyMatch.visitor_id;
              matchedBy = `fuzzy_ua:${clientUA.os}_${clientUA.version}`;
              matchedEvent = bestFuzzyMatch;
            //   console.log(`[BET IDENTIFY] ✅ Fuzzy Match! ${visitor_id} (${matchedBy})`);
            }
          }
        }
      }
    } else {
      matchedBy = "direct";
      // console.log(`[BET IDENTIFY] visitor_id provided directly: ${visitor_id}`);
      
      // Buscar evento original para pegar metadados, mesmo vindo direto da URL
      if (!matchedEvent) {
          const { data: originalEvent } = await supabase
            .from("events")
            .select("metadata")
            .eq("visitor_id", visitor_id)
            .limit(1)
            .single();
            
          if (originalEvent) matchedEvent = originalEvent;
      }
    }

    // Se houve match/evento encontrado, preencher dados faltantes
    if (matchedEvent) {
       const meta = matchedEvent.metadata || {};
       if (!fbc && meta.fbc) fbc = meta.fbc;
       if (!fbp && meta.fbp) fbp = meta.fbp;
       if (!utm_source && meta.utm_source) utm_source = meta.utm_source;
       if (!utm_medium && meta.utm_medium) utm_medium = meta.utm_medium;
       if (!utm_campaign && meta.utm_campaign) utm_campaign = meta.utm_campaign;
    }

    // ========================================
    // GEOLOCALIZAÇÃO - FALLBACK ROBUSTO
    // ========================================
    let geoData: {
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    } = {};

    // 1. Tentar pegar do evento original (se houver)
    if (matchedEvent?.metadata) {
        const meta = matchedEvent.metadata;
        geoData = {
          city: meta.city,
          state: meta.region || meta.state,
          country: meta.country,
          postalCode: meta.postal_code,
        };
    }

    // 2. Se não encontrou no evento, usar headers da Vercel (IP atual)
    if (!geoData.city && vercelCity) {
        console.log(`[BET IDENTIFY] Usando Vercel Headers para GeoIP Fallback: ${vercelCity}, ${vercelRegion}`);
        geoData = {
            city: decodeURIComponent(vercelCity),
            state: vercelRegion ? decodeURIComponent(vercelRegion) : undefined,
            country: vercelCountry ? decodeURIComponent(vercelCountry) : undefined,
        };
    }

    // ========================================
    // LÓGICA DE ROTEAMENTO (Lucas vs Pedro Zutti vs Desconhecido)
    // ========================================
    // IMPORTANTE: Agora EXIGIMOS funnel_id para enviar eventos CAPI
    // Isso evita poluição de leads de afiliados aleatórios
    
    const funnelIdLower = funnel_id?.toLowerCase() || "";
    
    // Identificar funil
    const isPedroZutti = funnelIdLower === "pedrozutti";
    const isLucasMagnotti = funnelIdLower === "lucasmagnotti" || funnelIdLower === "lucas";
    const isKnownFunnel = isPedroZutti || isLucasMagnotti;
    
    // Definir tabela e config de pixel baseado no funil
    let targetTable: string;
    let PIXEL_CONFIG: { pixelId: string; accessToken: string } | null = null;
    
    if (isPedroZutti) {
        targetTable = "bet_leads_pedrozutti";
        PIXEL_CONFIG = {
            pixelId: "1217675423556541", 
            accessToken: "EAAb7wyx9POsBQZA6xqf8Wc49ZAUjhqZAWv8zdjgBqebt7nHoNCKTZCZAbttOGxUsuWNQfnrYjqjs47aZAwWWlFJ7FmxtZC2ct2CH5fhGINNwGtBQoWGwYGZAwa2Tz3z43hlkZBkynZCQi6QsvITiaITkxxRQDozwX0ZBmEUFHuWLEwRdMfWM3Ts2ZBss5MrZCYsl7OgZDZD"
        };
    } else if (isLucasMagnotti) {
        targetTable = "bet_leads_lucasmagnotti";
        PIXEL_CONFIG = {
            pixelId: "1254338099849797",
            accessToken: "EAAkK1oRLUisBQMhcDyobaYzlnZBNODTNWrmVH7FvWTQiHlmZBl7MvRKNvKoJ4uXx17v92TZC88oxDbnU9eZA84zDmyuC2xiTcZCgLXX3h95plBYp7kfRz8Ne0ZBiBuQugGaL3aOVj0HXuaURN17S97ZA0L5ZBLlZBf9ruTS3faC7U40qgtnYxjS9QMpwLxbtqzQZDZD"
        };
    } else {
        // Funil desconhecido (afiliados aleatórios) - salvar em bet_leads mas NÃO enviar CAPI
        targetTable = "bet_leads";
        PIXEL_CONFIG = null; // Não envia para nenhum pixel!
        console.log(`[BET IDENTIFY] ⚠️ Funil desconhecido (funnel_id: ${funnel_id || "vazio"}). Salvando em bet_leads mas SEM enviar CAPI.`);
    }

    console.log(`[BET IDENTIFY] Roteando para: ${isPedroZutti ? "Pedro Zutti" : isLucasMagnotti ? "Lucas Magnotti" : "DESCONHECIDO"} (Tabela: ${targetTable}, CAPI: ${PIXEL_CONFIG ? "SIM" : "NÃO"})`);

    // Upsert: Salvar todo o conhecimento acumulado na tabela correta
    const { data, error } = await supabase
      .from(targetTable) // Usa a tabela dinâmica
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
          
          // Dados enriquecidos
          city: geoData.city || null,
          state: geoData.state || null,
          country: geoData.country || null,
          postal_code: geoData.postalCode || null,
          
          ip_address: ip,
          user_agent: userAgent,
          status: "registered",
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
      if (error.code === "23505") { // Conflito de chave única, fallback para update
        await supabase
          .from(targetTable)
          .update({
            // Atualizar apenas o que pode ter mudado ou enriquecido
            phone: phone || undefined,
            visitor_id: visitor_id || undefined,
            fbc: fbc || undefined,
            fbp: fbp || undefined,
            city: geoData.city || undefined,
            state: geoData.state || undefined,
            country: geoData.country || undefined,
            postal_code: geoData.postalCode || undefined,
            ip_address: ip,
            user_agent: userAgent,
            status: "registered",
          })
          .eq("email", email.toLowerCase().trim());
      } else {
        console.error(`Error upserting ${targetTable}:`, error);
      }
    }

    // ========================================
    // ENVIAR EVENTO PARA FACEBOOK CAPI
    // ========================================
    let capiSent = false;
    
    // SÓ envia CAPI se:
    // 1. Tem email
    // 2. Tem PIXEL_CONFIG (funil conhecido - Lucas ou Pedro)
    // Funis desconhecidos (afiliados) são SALVOS mas NÃO enviam CAPI
    if (email && PIXEL_CONFIG) {
      const capiResult = await sendCAPIEvent(
        PIXEL_CONFIG.pixelId,
        PIXEL_CONFIG.accessToken,
        "Cadastrou_bet", 
        {
          email: email,
          phone: phone,

          fbc: fbc,
          fbp: fbp,
          ip: ip,
          userAgent: userAgent,
          currency: "BRL",
          value: 0, 
          // Dados de geolocalização completos (Match ou Fallback)
          city: geoData.city,
          state: geoData.state,
          country: geoData.country,
          postalCode: geoData.postalCode,
          externalId: visitor_id,
        }
      );
      
      capiSent = capiResult?.events_received > 0;
    } else if (!PIXEL_CONFIG) {
      console.log(`[BET IDENTIFY] ⚠️ CAPI não enviado - funil desconhecido`);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Lead identificado",
        capi_sent: capiSent,
        event: "Cadastrou_bet",
        matched_by: matchedBy,
        visitor_id: visitor_id || null,
        geo_source: geoData.city ? (matchedEvent ? "match" : "vercel_header") : "none"
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
