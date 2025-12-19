import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: /api/bet/webhook
 * 
 * Recebe webhooks da bet (cadastro e depósito).
 * Faz o match pelo email e dispara eventos para o Facebook CAPI.
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

// Importar função de envio CAPI (se existir)
async function sendCAPIEvent(
  pixelId: string,
  accessToken: string,
  eventName: string,
  eventData: any
) {
  const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;
  
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: {
          em: eventData.email ? [hashSHA256(eventData.email.toLowerCase())] : undefined,
          ph: eventData.phone ? [hashSHA256(eventData.phone.replace(/\D/g, ""))] : undefined,
          fbc: eventData.fbc || undefined,
          fbp: eventData.fbp || undefined,
          client_ip_address: eventData.ip || undefined,
          client_user_agent: eventData.userAgent || undefined,
        },
        custom_data: {
          currency: eventData.currency || "BRL",
          value: eventData.value || 0,
        },
      },
    ],
    access_token: accessToken,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("CAPI Error:", error);
    return null;
  }
}

// Hash SHA256 para dados do usuário (requisito do Facebook CAPI)
function hashSHA256(value: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extrair dados do webhook (pode vir como array ou objeto)
    const webhookData = Array.isArray(body) ? body[0]?.body || body[0] : body.body || body;
    
    const { email, phone, name, valor, status, transaction_status, currency } = webhookData;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email não encontrado no webhook" },
        { status: 400 }
      );
    }

    // Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar lead pelo email
    const { data: lead, error: leadError } = await supabase
      .from("bet_leads")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    // Determinar tipo de evento
    const isDeposit = valor !== undefined && (status === "PAID" || transaction_status === "completed");
    const eventType = isDeposit ? "deposit" : "register";

    // Se encontrou o lead, temos os dados de tracking
    if (lead) {
      // Atualizar status do lead
      const updateData: any = {
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
        .from("bet_leads")
        .update(updateData)
        .eq("id", lead.id);

      // Buscar pixel do usuário (você pode configurar um pixel fixo ou buscar do banco)
      // Por ora, vamos buscar o primeiro pixel disponível ou usar variável de ambiente
      const { data: pixels } = await supabase
        .from("pixels")
        .select("pixel_id, access_token")
        .limit(1)
        .single();

      if (pixels?.pixel_id && pixels?.access_token && lead.fbc) {
        // Enviar evento para Facebook CAPI
        const eventName = isDeposit ? "Purchase" : "Lead";
        
        await sendCAPIEvent(
          pixels.pixel_id,
          pixels.access_token,
          eventName,
          {
            email: email,
            phone: phone || lead.phone,
            fbc: lead.fbc,
            fbp: lead.fbp,
            ip: lead.ip_address,
            userAgent: lead.user_agent,
            currency: currency || "BRL",
            value: isDeposit ? valor : 0,
          }
        );

        console.log(`[BET WEBHOOK] ${eventName} event sent to CAPI for ${email}`);
      }

      return NextResponse.json({
        success: true,
        message: `Evento ${eventType} processado`,
        matched: true,
        lead_id: lead.id,
        capi_sent: !!(pixels?.pixel_id && lead.fbc),
      });

    } else {
      // Lead não encontrado - salvar mesmo assim para histórico
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

      console.log(`[BET WEBHOOK] Lead ${email} não tinha tracking, salvo para histórico`);

      return NextResponse.json({
        success: true,
        message: `Evento ${eventType} salvo (sem tracking)`,
        matched: false,
        lead_id: newLead?.id,
        capi_sent: false,
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
    usage: "POST with { email, phone, valor?, status?, transaction_status? }",
  });
}
