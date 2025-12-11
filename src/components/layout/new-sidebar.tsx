"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutGrid, 
  Globe, 
  BarChart2, 
  Send, 
  Filter, 
  MessageSquare, 
  CreditCard, 
  Code, 
  LogOut,
  FileText,
  Tags
} from 'lucide-react';
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { TrackGramLogo } from "@/components/ui/trackgram-logo";
import { useSubscription } from "@/hooks/use-subscription";
import { differenceInDays, parseISO } from "date-fns";

const menuItems = [
    { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutGrid },
    { id: "dominios", label: "Domínios", href: "/domains", icon: Globe },
    { id: "pixels", label: "Pixels", href: "/pixels", icon: BarChart2 },
    { id: "canal", label: "Canal", href: "/channels", icon: Send },
    { id: "funis", label: "Funis", href: "/funnels", icon: Filter },
    { id: "logs", label: "Logs", href: "/logs", icon: FileText },
    { id: "utms", label: "UTMs", href: "/utms", icon: Tags },
    { id: "mensagens", label: "Mensagens", href: "/messages", icon: MessageSquare },
    { id: "assinatura", label: "Assinatura", href: "/subscription", icon: CreditCard },
    { id: "postbacks", label: "Postbacks", href: "/postbacks", icon: Code },
];

export function NewSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const { isSubscribed, plan, subscription } = useSubscription();

  useEffect(() => {
    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu da conta.");
    router.refresh();
  };

  return (
    <nav className="fixed left-6 top-6 bottom-6 w-64 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col py-6 z-50 shadow-2xl shadow-black/60 hidden md:flex">
      {/* Logo */}
      <div className="mb-8 px-6 flex items-center gap-3">
        <div className="shrink-0 shadow-lg shadow-violet-500/30 rounded-xl overflow-hidden">
          <TrackGramLogo size={44} />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-none tracking-tight">TrackGram</h1>
          <span className="text-[10px] text-violet-400 font-medium tracking-widest uppercase">Analytics</span>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-col gap-1 w-full px-3 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.id} 
              href={item.href} 
              prefetch={true}
              onMouseEnter={() => router.prefetch(item.href)}
              className="relative group"
            >
              <div className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer
                ${isActive 
                  ? 'bg-white text-black shadow-lg shadow-white/10 font-semibold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'}
              `}>
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-violet-600" : ""} />
                <span className="text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 w-full px-3">
        {user && (
            <div className="px-4 py-2 mb-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Logado como</div>
                <div className="text-xs text-white font-medium truncate mb-1">{user.email}</div>
                
                {isSubscribed && subscription ? (
                   <div className="mt-2 p-2 bg-gradient-to-r from-violet-900/20 to-fuchsia-900/20 rounded-lg border border-violet-500/20 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-violet-300 font-semibold">{plan}</div>
                        <div className="text-[9px] text-gray-500">
                          {subscription.current_period_end 
                            ? `Renova em ${differenceInDays(parseISO(subscription.current_period_end), new Date())} dias`
                            : "Vitalício"}
                        </div>
                      </div>
                      <div className="text-xs text-emerald-400 font-bold">PRO</div>
                   </div>
                ) : (
                  <div className="mt-2 text-[10px] text-gray-600">
                    Plano Gratuito
                  </div>
                )}
            </div>
        )}
        {user ? (
            <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-medium"
            >
                <LogOut size={18} />
                <span>Sair</span>
            </button>
        ) : (
            <Link href="/login" className="flex items-center gap-3 w-full px-4 py-2.5 text-white hover:bg-white/10 rounded-xl transition-colors text-sm font-medium">
                <LogOut size={18} className="rotate-180" />
                <span>Entrar</span>
            </Link>
        )}
      </div>
    </nav>
  );
}
