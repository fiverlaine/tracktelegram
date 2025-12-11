"use client";

import { PageHeader } from "@/components/layout/page-header";
import { CreditCard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscriptionPage() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Assinatura" description="Gerencie seu plano e método de pagamento." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                 {/* Current Plan Card */}
                <div className="p-8 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20 rounded-3xl relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Shield className="h-32 w-32 text-violet-500" />
                    </div>
                    
                    <div className="relative z-10">
                        <span className="px-3 py-1 bg-violet-500 text-white text-xs font-bold rounded-full uppercase tracking-widest mb-4 inline-block">
                            Plano Atual
                        </span>
                        <h2 className="text-3xl font-bold text-white mb-2">Pro Analytics</h2>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-bold text-white">R$ 97</span>
                            <span className="text-gray-400">/mês</span>
                        </div>
                        
                        <ul className="space-y-3 mb-8 text-gray-300">
                            {[
                                "Eventos Ilimitados",
                                "Pixels Ilimitados",
                                "Canais Ilimitados",
                                "API de Conversões (CAPI)",
                                "Suporte Prioritário"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <Button className="w-full bg-white text-black hover:bg-gray-200 font-bold rounded-xl h-12">
                            Gerenciar Assinatura
                        </Button>
                    </div>
                </div>

                {/* Coming Soon Features */}
                <div className="p-8 bg-[#0a0a0a]/60 border border-white/5 rounded-3xl backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                            <CreditCard className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Histórico de Cobranças</h3>
                    </div>
                    
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-black/20">
                        <p className="text-gray-500">Nenhuma fatura encontrada.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
