"use server";

import { createClient } from "@/lib/supabase/server";
import dns from "dns";
import { promisify } from "util";

const resolveTxt = promisify(dns.resolveTxt);

export async function verifyDomain(domainId: string) {
    const supabase = await createClient();
    
    // 1. Get Domain Info
    const { data: domain, error } = await supabase
        .from("domains")
        .select("id, domain, verification_token")
        .eq("id", domainId)
        .single();

    if (error || !domain) {
        throw new Error("Domínio não encontrado.");
    }

    if (!domain.verification_token) {
        throw new Error("Token de verificação não encontrado para este domínio.");
    }

    const verificationRecord = `trackgram=${domain.verification_token}`;

    try {
        console.log(`Verifying DNS for ${domain.domain}... expecting ${verificationRecord}`);
        const records = await resolveTxt(domain.domain);
        console.log("Records found:", records);
        
        // records is string[][]
        const flatRecords = records.flat();
        
        const isVerified = flatRecords.includes(verificationRecord);
        
        if (isVerified) {
            await supabase
                .from("domains")
                .update({ verified: true })
                .eq("id", domainId);
            
            return { success: true, message: "Domínio verificado com sucesso!" };
        } else {
            return { success: false, message: "Registro DNS não encontrado. Aguarde a propagação e tente novamente." };
        }

    } catch (e: any) {
        console.error("DNS Verification Error:", e);
        return { success: false, message: `Erro na verificação DNS: ${e.message}` };
    }
}
