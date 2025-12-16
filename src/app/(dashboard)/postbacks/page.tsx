"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Code, Terminal } from "lucide-react";

export default function PostbacksPage() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Postbacks" description="Configure URLs de postback para integração com plataformas de afiliados." />

            <div className="flex flex-col items-center justify-center py-20 bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl text-center">
                <div className="w-16 h-16 bg-neutral-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <Code className="h-8 w-8 text-neutral-500 dark:text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Em Breve</h2>
                <p className="text-neutral-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                    A funcionalidade de Postbacks permitirá enviar eventos de conversão diretamente para plataformas como Hotmart, Eduzz, Kiwify e outras.
                </p>
                <div className="p-4 bg-neutral-100 dark:bg-black/40 rounded-xl border border-neutral-200 dark:border-white/10 w-full max-w-sm text-left">
                    <div className="flex items-center gap-2 mb-2 text-neutral-500 dark:text-gray-500 text-xs uppercase font-bold tracking-wider">
                        <Terminal className="h-3 w-3" /> Preview
                    </div>
                    <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400 block break-all">
                        https://api.trackgram.com/postback?tid={'{transaction_id}'}&val={'{value}'}
                    </code>
                </div>
            </div>
        </div>
    );
}
