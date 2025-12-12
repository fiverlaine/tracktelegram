"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Verifica metatag de verificação no HTML do domínio
 * Faz uma requisição HTTP para o domínio e procura pela metatag
 */
async function verifyMetaTag(domain: string, verificationToken: string): Promise<boolean> {
    try {
        // Clean domain (remove protocol, www, trailing slashes)
        let cleanDomain = domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '')
            .trim();
        
        // Try with https first, fallback to http
        let html: string | null = null;
        let lastError: Error | null = null;
        
        const urls = [
            `https://${cleanDomain}`,
            `https://${cleanDomain}/`,
            `http://${cleanDomain}`,
            `http://${cleanDomain}/`,
        ];
        
        for (const url of urls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'TrackGram-Verification-Bot/1.0',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                    signal: controller.signal,
                    redirect: 'follow',
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    html = await response.text();
                    break; // Success, exit loop
                }
            } catch (error: any) {
                lastError = error;
                // Continue to next URL
                continue;
            }
        }
        
        if (!html) {
            throw lastError || new Error("Não foi possível acessar o domínio");
        }
        
        // Look for the verification meta tag with multiple pattern variations
        // Pattern 1: <meta name="trackgram-verification" content="TOKEN">
        // Pattern 2: <meta content="TOKEN" name="trackgram-verification">
        // Pattern 3: <meta name='trackgram-verification' content='TOKEN'>
        // Pattern 4: With extra spaces or attributes
        
        const patterns = [
            /<meta\s+name=["']trackgram-verification["']\s+content=["']([^"']+)["']/i,
            /<meta\s+content=["']([^"']+)["']\s+name=["']trackgram-verification["']/i,
            /<meta\s+name=['"]trackgram-verification['"]\s+content=['"]([^'"]+)['"]/i,
            /<meta\s+content=['"]([^'"]+)['"]\s+name=['"]trackgram-verification['"]/i,
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                const foundToken = match[1].trim();
                console.log(`[MetaTag Verification] Token encontrado: ${foundToken}, esperado: ${verificationToken}`);
                
                // Compare tokens (case-sensitive for security)
                if (foundToken === verificationToken) {
                    return true;
                }
            }
        }
        
        // If no match found, log for debugging
        console.log(`[MetaTag Verification] Metatag não encontrada no HTML. Procurando por padrões...`);
        
        // Check if the HTML contains the token anywhere (for debugging)
        if (html.includes(verificationToken)) {
            console.log(`[MetaTag Verification] ⚠️ Token encontrado no HTML mas não em formato de metatag válida`);
        }
        
        return false;
    } catch (error: any) {
        console.error("[MetaTag Verification] Erro:", error);
        
        // Handle timeout
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error("Timeout ao acessar o domínio. Verifique se o site está acessível.");
        }
        
        // Handle network errors
        if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
            throw new Error("Não foi possível conectar ao domínio. Verifique se o site está online e acessível.");
        }
        
        throw new Error(`Erro ao verificar metatag: ${error.message || "Erro desconhecido"}`);
    }
}

export async function verifyDomain(domainId: string) {
    const supabase = await createClient();
    
    // 1. Get Domain Info
    const { data: domain, error } = await supabase
        .from("domains")
        .select("id, domain, verification_token")
        .eq("id", domainId)
        .single();

    if (error || !domain) {
        return { success: false, message: "Domínio não encontrado." };
    }

    if (!domain.verification_token) {
        return { success: false, message: "Token de verificação não encontrado para este domínio." };
    }

    try {
        console.log(`[Domain Verification] Verificando metatag para ${domain.domain}...`);
        console.log(`[Domain Verification] Token esperado: ${domain.verification_token}`);
        
        // Verify meta tag via HTTP request
        const isVerified = await verifyMetaTag(domain.domain, domain.verification_token);
        
        if (isVerified) {
            // Update domain as verified
            const { error: updateError } = await supabase
                .from("domains")
                .update({ verified: true })
                .eq("id", domainId);
            
            if (updateError) {
                console.error("[Domain Verification] Erro ao atualizar domínio:", updateError);
                return { success: false, message: "Erro ao atualizar status de verificação." };
            }
            
            console.log(`[Domain Verification] ✅ Domínio ${domain.domain} verificado com sucesso!`);
            return { success: true, message: "Domínio verificado com sucesso!" };
        } else {
            console.log(`[Domain Verification] ❌ Metatag de verificação não encontrada`);
            return { 
                success: false, 
                message: `Metatag de verificação não encontrada. Verifique se você adicionou a metatag corretamente no <head> do seu site e se o site está acessível publicamente.` 
            };
        }

    } catch (e: any) {
        console.error("[Domain Verification] Erro na verificação:", e);
        return { 
            success: false, 
            message: `Erro na verificação: ${e.message || "Erro desconhecido"}` 
        };
    }
}

