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

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const { plan } = useSubscription();

  // Optimistic UI for instant click feedback
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

  useEffect(() => {
    // Reset optimistic path when the real pathname updates (navigation complete)
    setOptimisticPath(null);
  }, [pathname]);

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
    router.push("/login");
  };

  return (
    <nav className="fixed left-6 top-6 bottom-6 w-64 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border border-neutral-200 dark:border-white/10 rounded-3xl flex flex-col py-6 z-50 shadow-2xl shadow-neutral-200/60 dark:shadow-black/60 hidden md:flex">
      {/* Logo */}
      <div className="mb-8 px-6 flex items-center justify-start">
        <TrackGramLogo iconSize={42} textSize={20} />
      </div>
      <div>
        <div className="sr-only">
          <h1 className="font-bold text-lg leading-none tracking-tight">
            <span className="text-violet-600 dark:text-violet-500">Track</span>
            <span className="text-neutral-900 dark:text-white">Gram</span>
          </h1>
          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium tracking-widest uppercase">Analytics</span>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-col gap-1 w-full px-3 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          // Determine active state: prioritizing optimistic path if set, otherwise fallback to current pathname
          const isActive = (optimisticPath || pathname) === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setOptimisticPath(item.href)}
              className="relative group block"
            >
              <div className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer
                ${isActive
                  ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/20 dark:bg-white dark:text-black dark:shadow-white/10 font-semibold'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}
              `}>
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-violet-400 dark:text-violet-600" : ""} />
                <span className="text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto w-full px-3 pt-4 border-t border-neutral-200 dark:border-white/5">
        {user ? (
          <Popover>
            <PopoverTrigger asChild>
              <div className="w-full flex items-center justify-between p-1.5 pr-2 rounded-2xl bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-white/5 cursor-pointer group select-none">
                {/* Left: Avatar + Info */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-300 font-bold text-sm shrink-0 border border-violet-200 dark:border-violet-500/20">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white truncate leading-tight">
                        {plan || "Gratuito"}
                      </span>
                      {/* Indicador de Status (opcional, adicionei pra dar um charme) */}
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-[10px] text-neutral-500 dark:text-gray-400 truncate leading-tight w-28">
                      {user?.email}
                    </span>
                  </div>
                </div>

                {/* Right: Theme Toggle */}
                <div onClick={(e) => e.stopPropagation()}>
                  <AnimatedThemeToggler className="w-8 h-8 rounded-full bg-white dark:bg-black border border-neutral-200 dark:border-white/10 shadow-sm hover:scale-105 flex items-center justify-center" />
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1 mb-2 bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 shadow-xl rounded-xl" side="right" align="end" sideOffset={10}>
              <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 dark:text-gray-500/50 uppercase tracking-widest mb-1">
                Conta
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-xs font-medium transition-colors"
              >
                <LogOut size={14} />
                Sair da conta
              </button>
            </PopoverContent>
          </Popover>
        ) : (
          <Link href="/login" className="flex items-center gap-3 w-full px-4 py-2.5 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-xl transition-colors text-sm font-medium">
            <LogOut size={18} className="rotate-180" />
            <span>Entrar</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
