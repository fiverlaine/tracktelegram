"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Plan {
    id: string;
    name: string;
    price: string;
    description: string;
    features: string[];
    highlight?: boolean;
    buttonText?: string;
    color: string;
    checkoutUrl?: string; // Added field
}

const plans: Plan[] = [
    {
        id: "starter",
        name: "Starter (Teste)", // Updated name slightly to indicate checking
        price: "5", // Updated price
        description: "Ideal para quem está começando a escalar suas campanhas.",
        color: "blue",
        checkoutUrl: "https://pay.cakto.com.br/whxxcwj_684643", // Added URL
        features: [
            "5 Domínios Personalizados",
            "5 Pixels do Facebook",
            "2 Canais/Bots Telegram",
            "10 Funis de Rastreamento",
            "Entradas Ilimitadas",
            "Suporte por Email"
        ]
    },
    {
        id: "pro",
        name: "Pro Scale",
        price: "197",
        description: "Para players que precisam de mais volume e estrutura.",
        highlight: true,
        color: "violet",
        buttonText: "Assinar Plano Pro",
        features: [
            "15 Domínios Personalizados",
            "15 Pixels do Facebook",
            "5 Canais/Bots Telegram",
            "Funis Ilimitados",
            "Entradas Ilimitadas",
            "Suporte Prioritário",
            "Acesso à API (Em breve)"
        ]
    },
    // ... Enterprise stays same
    {
        id: "enterprise",
        name: "Enterprise",
        price: "297",
        description: "Liberdade total para grandes operações e agências.",
        color: "emerald",
        features: [
            "Domínios Ilimitados",
            "Pixels Ilimitados",
            "Canais Ilimitados",
            "Funis Ilimitados",
            "Entradas Ilimitadas",
            "Gerente de Conta Dedicado",
            "White Label (Em breve)"
        ]
    }
];

export default function SubscriptionPage() {
    const [loading, setLoading] = useState<string | null>(null);

    const handleSubscribe = (planId: string) => {
        setLoading(planId);
        
        const plan = plans.find(p => p.id === planId);
        if (plan?.checkoutUrl) {
             window.location.href = plan.checkoutUrl;
             return;
        }

        // Placeholder for future payment gateway integration
        setTimeout(() => {
            toast.info("Em breve disponível!");
            setLoading(null);
        }, 1000);
    };
    
    // ... Rest of component stays same

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <PageHeader 
                title="Planos de Assinatura" 
                description="Escolha o plano ideal para escalar sua operação sem limites." 
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        className={`
                            relative flex flex-col p-6 rounded-3xl border backdrop-blur-xl transition-all duration-300
                            ${plan.highlight 
                                ? "bg-violet-950/20 border-violet-500/50 shadow-2xl shadow-violet-500/20 md:-mt-8 md:mb-4 z-10" 
                                : "bg-[#0a0a0a]/60 border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                            }
                        `}
                    >
                        {plan.highlight && (
                            <div className="absolute -top-4 inset-x-0 flex justify-center">
                                <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                                    MAIS POPULAR
                                </span>
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${
                                plan.color === 'blue' ? 'text-blue-400' :
                                plan.color === 'violet' ? 'text-violet-400' : 'text-emerald-400'
                            }`}>
                                <Zap className="w-5 h-5" />
                                {plan.name}
                            </h3>
                            <div className="flex items-end gap-1 mb-2">
                                <span className="text-4xl font-bold text-white">R$ {plan.price}</span>
                                <span className="text-gray-500 mb-1">/mês</span>
                            </div>
                            <p className="text-sm text-gray-400">{plan.description}</p>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                    <div className={`
                                        mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0
                                        ${plan.highlight ? "bg-violet-500/20 text-violet-300" : "bg-white/10 text-gray-400"}
                                    `}>
                                        <Check className="w-2.5 h-2.5" />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <Button 
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={!!loading}
                            className={`
                                w-full h-12 rounded-xl font-bold transition-all
                                ${plan.highlight 
                                    ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25" 
                                    : "bg-white text-black hover:bg-gray-200"
                                }
                            `}
                        >
                            {loading === plan.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                plan.buttonText || "Assinar Agora"
                            )}
                        </Button>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center">
                <p className="text-gray-500 text-sm">
                    Precisa de um plano customizado para sua empresa? <br />
                    <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">Entre em contato com nosso time de vendas.</a>
                </p>
            </div>
        </div>
    );
}

