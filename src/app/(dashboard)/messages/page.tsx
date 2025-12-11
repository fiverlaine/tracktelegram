"use client";

import { PageHeader } from "@/components/layout/page-header";
import { MessageSquare, Clock } from "lucide-react";

export default function MessagesPage() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader title="Mensagens" description="Gerencie as mensagens automáticas enviadas pelo bot." />

            <div className="flex flex-col items-center justify-center py-20 bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/5 rounded-2xl text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <MessageSquare className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Em Breve</h2>
                <p className="text-gray-400 max-w-md mx-auto mb-8">
                    Estamos trabalhando nesta funcionalidade. Em breve você poderá configurar mensagens de boas-vindas e sequências automáticas.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 bg-violet-600/10 text-violet-400 rounded-full text-sm font-medium border border-violet-600/20">
                    <Clock className="h-4 w-4" />
                    <span>Lançamento previsto para Q4 2025</span>
                </div>
            </div>
        </div>
    );
}
