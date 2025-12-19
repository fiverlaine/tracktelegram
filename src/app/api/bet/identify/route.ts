import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: /api/bet/identify
 * 
 * Recebe dados de identificação do lead vindos do script injetado na bet.
 * Cria/atualiza o registro na tabela bet_leads para fazer o match email <-> visitor_id.
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
          status: "identified",
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
        const { error: updateError } = await supabase
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
          })
          .eq("email", email.toLowerCase().trim());
        
        if (updateError) {
          console.error("Error updating bet_lead:", updateError);
        }
      } else {
        console.error("Error upserting bet_lead:", error);
      }
    }

    return NextResponse.json(
      { success: true, message: "Lead identificado" },
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
