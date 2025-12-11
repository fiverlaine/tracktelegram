"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles, Zap, Calendar, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { plans } from "@/config/subscription-plans";

export default function SubscriptionPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const { isSubscribed, plan: currentPlanName, subscription, isLoading: subLoading } = useSubscription();

    const handleSubscribe = (planId: string) => {
        setLoading(planId);
        
        const plan = plans.find(p => p.id === planId);
        if (plan?.checkoutUrl) {
             window.location.href = plan.checkoutUrl;
             return;
        }

        setTimeout(() => {
            toast.info("Em breve disponível!");
            setLoading(null);
        }, 1000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <PageHeader 
                title="Planos de Assinatura" 
                description="Escolha o plano ideal para escalar sua operação sem limites." 
            />

            {/* Current Subscription Status */}
            {isSubscribed && subscription && (
                 <div className="bg-gradient-to-r from-violet-900/40 to-fuchsia-900/40 border border-violet-500/30 rounded-2xl p-6 md:p-8 backdrop-blur-xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-300">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">Assinatura Ativa</h2>
                                <p className="text-violet-200/80 text-sm">
                                    Seu plano atual é <span className="text-white font-semibold">{currentPlanName}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <div className={`w-2 h-2 rounded-full ${subscription.status === 'active' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                                <span className="capitalize">{subscription.status === 'active' ? 'Ativo' : subscription.status}</span>
                            </div>
                            <div className="hidden sm:block w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>Renova em: {subscription.current_period_end ? format(new Date(subscription.current_period_end), "dd 'de' MMMM, yyyy", { locale: ptBR }) : "--"}</span>
                            </div>
                        </div>
                    </div>
                 </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
                {plans.map((plan) => {
                    const isCurrentPlan = currentPlanName === plan.name;
                    
                    return (
                        <div 
                            key={plan.id}
                            className={`
                                relative flex flex-col p-6 rounded-3xl border backdrop-blur-xl transition-all duration-300
                                ${plan.highlight 
                                    ? "bg-violet-950/20 border-violet-500/50 shadow-2xl shadow-violet-500/20 md:-mt-8 md:mb-4 z-10" 
                                    : "bg-[#0a0a0a]/60 border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                                }
                                ${isCurrentPlan ? "ring-2 ring-emerald-500/50 border-emerald-500/30 bg-emerald-950/20" : ""}
                            `}
                        >
                            {plan.highlight && !isCurrentPlan && (
                                <div className="absolute -top-4 inset-x-0 flex justify-center">
                                    <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                                        MAIS POPULAR
                                    </span>
                                </div>
                            )}

                            {isCurrentPlan && (
                                <div className="absolute -top-4 inset-x-0 flex justify-center">
                                    <span className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                        <Check className="w-3 h-3" />
                                        SEU PLANO
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${
                                    plan.color === 'blue' ? 'text-blue-400' :
                                    plan.color === 'violet' ? 'text-violet-400' : 
                                    plan.color === 'emerald' ? 'text-emerald-400' : 'text-gray-400'
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
                                disabled={!!loading || isCurrentPlan}
                                className={`
                                    w-full h-12 rounded-xl font-bold transition-all
                                    ${isCurrentPlan
                                        ? "bg-emerald-600/20 text-emerald-400 cursor-default hover:bg-emerald-600/20"
                                        : plan.highlight 
                                            ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25" 
                                            : "bg-white text-black hover:bg-gray-200"
                                    }
                                `}
                            >
                                {loading === plan.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isCurrentPlan ? (
                                    "Plano Atual"
                                ) : (
                                    plan.buttonText || "Assinar Agora"
                                )}
                            </Button>
                        </div>
                    );
                })}
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

