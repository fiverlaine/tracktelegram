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

                console.log(`[MetaTag Verification] Tentando acessar: ${url}`);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        // Use a real browser User-Agent to avoid blocking
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    signal: controller.signal,
                    redirect: 'follow',
                });

                clearTimeout(timeoutId);

                console.log(`[MetaTag Verification] Status: ${response.status} ${response.statusText}`);

                if (response.ok) {
                    html = await response.text();
                    console.log(`[MetaTag Verification] HTML recebido (${html.length} chars)`);
                    break; // Success, exit loop
                } else {
                    console.warn(`[MetaTag Verification] Falha ao acessar ${url}: ${response.status}`);
                }
            } catch (error: any) {
                console.error(`[MetaTag Verification] Erro ao acessar ${url}:`, error.message);
                lastError = error;
                // Continue to next URL
                continue;
            }
        }

        if (!html) {
            throw lastError || new Error("Não foi possível acessar o domínio (todas as tentativas falharam)");
        }

        // Normalize HTML to simplify regex (remove newlines inside tags)
        const normalizedHtml = html.replace(/\n/g, ' ');

        // Look for the verification meta tag with a more robust regex
        // This regex looks for <meta ... > and checks if it contains both name="trackgram-verification" and content="TOKEN"
        // in any order, allowing for other attributes.

        const metaTagRegex = /<meta[^>]+>/gi;
        const metaTags = normalizedHtml.match(metaTagRegex) || [];

        console.log(`[MetaTag Verification] Encontradas ${metaTags.length} meta tags.`);

        for (const tag of metaTags) {
            // Check if this tag is our verification tag
            if (tag.toLowerCase().includes('name="trackgram-verification"') ||
                tag.toLowerCase().includes("name='trackgram-verification'")) {

                console.log(`[MetaTag Verification] Tag candidata encontrada: ${tag}`);

                // Extract content
                const contentMatch = tag.match(/content=["']([^"']+)["']/i);
                if (contentMatch && contentMatch[1]) {
                    const foundToken = contentMatch[1].trim();
                    console.log(`[MetaTag Verification] Token extraído: ${foundToken}`);

                    if (foundToken === verificationToken) {
                        return true;
                    }
                }
            }
        }

        // If no match found, log for debugging
        console.log(`[MetaTag Verification] Metatag não encontrada. HTML Preview (primeiros 500 chars):`);
        console.log(html.substring(0, 500));

        // Check if the HTML contains the token anywhere (for debugging)
        if (html.includes(verificationToken)) {
            console.log(`[MetaTag Verification] ⚠️ Token encontrado no HTML mas não em formato de metatag válida`);
            // Optional: Return true here if we want to be very lenient, but safer to stick to meta tag
        }

        return false;
    } catch (error: any) {
        console.error("[MetaTag Verification] Erro Fatal:", error);

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

