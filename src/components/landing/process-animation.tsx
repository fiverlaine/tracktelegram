"use client";

import { motion } from "framer-motion";
import { 
  Monitor, 
  Smartphone, 
  Code2, 
  ArrowRight,
  CheckCircle2,
  Database,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";

export function ProcessAnimation() {
  const [step, setStep] = useState(0);

  // Cycle through steps indefinitely: 0 -> 1 -> 2 -> 3 -> 4 -> pause -> 0
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 6);
    }, 1500); // 1.5s per step
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { 
      id: "ad", 
      icon: Monitor, 
      label: "Facebook Ad", 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      description: "Usuário clica"
    },
    { 
      id: "lp", 
      icon: Smartphone, 
      label: "Landing Page", 
      color: "text-purple-500", 
      bg: "bg-purple-500/10",
      description: "Carrega Script"
    },
    { 
      id: "process", 
      icon: Code2, 
      label: "TeleTrack", 
      color: "text-amber-500", 
      bg: "bg-amber-500/10",
      description: "Gera Link Único"
    },
    { 
      id: "telegram", 
      icon: Zap, 
      label: "Telegram", 
      color: "text-sky-500", 
      bg: "bg-sky-500/10",
      description: "Entrada Direta"
    },
    { 
      id: "track", 
      icon: CheckCircle2, 
      label: "Conversão", 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10",
      description: "Dispara CAPI"
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto p-6 md:p-8 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-0 relative">
        
        {/* DESKTOP: Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 hidden md:block" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-violet-600 to-indigo-600 -translate-y-1/2 transition-all duration-500 hidden md:block"
          style={{ width: `${Math.min(step * 25, 100)}%` }} 
        />

        {/* MOBILE: Connecting Line (Left aligned) */}
        <div className="absolute left-[2rem] top-0 w-1 h-full bg-white/5 -translate-x-1/2 md:hidden" />
        <div 
          className="absolute left-[2rem] top-0 w-1 bg-gradient-to-b from-violet-600 to-indigo-600 -translate-x-1/2 transition-all duration-500 md:hidden"
          style={{ height: `${Math.min(step * 25, 100)}%` }} 
        />

        {steps.map((s, index) => {
          const isActive = index <= step;
          const isCurrent = index === step;

          return (
            <div key={s.id} className="relative z-10 flex flex-row md:flex-col items-center gap-6 md:gap-4 w-full md:w-auto hover:bg-white/5 md:hover:bg-transparent p-2 md:p-0 rounded-xl transition-colors">
              
              {/* Icon Circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  filter: isActive ? "grayscale(0%)" : "grayscale(100%) opacity(30%)",
                  borderColor: isActive ? "rgba(139, 92, 246, 0.5)" : "rgba(255, 255, 255, 0.1)"
                }}
                className={`w-16 h-16 shrink-0 rounded-full border-2 flex items-center justify-center bg-[#0A0A0A] transition-colors duration-300 ${isActive ? s.color : 'text-gray-500'} relative z-20`}
              >
                <s.icon size={24} className="md:w-7 md:h-7" />
                
                {/* Pulse Effect for Current Item */}
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-violet-500/20" />
                )}
              </motion.div>

              {/* Text Info */}
              <motion.div 
                animate={{
                  opacity: isActive ? 1 : 0.3,
                  y: isCurrent ? 0 : 0
                }}
                className="text-left md:text-center flex-1 md:flex-none"
              >
                <h4 className={`font-bold text-base md:text-sm ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {s.label}
                </h4>
                <p className="text-xs md:text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wider">
                  {s.description}
                </p>
              </motion.div>
            </div>
          );
        })}

      </div>
      
      {/* Code Snippet Simulation below the process */}
      <div className="mt-12 mx-auto max-w-2xl bg-[#0F0F11] rounded-lg border border-white/5 p-4 font-mono text-xs overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-50" />
        
        <div className="flex gap-1.5 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
        </div>

        <div className="space-y-1 text-gray-400">
           
           <div className={`transition-opacity duration-300 ${step >= 0 ? 'opacity-100' : 'opacity-10'}`}>
             <span className="text-pink-500">const</span> <span className="text-blue-400">visitor</span> = <span className="text-yellow-300">await</span> track.<span className="text-blue-300">identify</span>(params);
           </div>

           <div className={`transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-10'}`}>
             <span className="text-gray-500">// Intercepting telegram link...</span>
           </div>

           <div className={`transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-10'}`}>
             <span className="text-pink-500">const</span> <span className="text-blue-400">invite</span> = <span className="text-yellow-300">await</span> api.<span className="text-blue-300">generateLink</span>(<span className="text-orange-300">"{'{visitor_id}'}"</span>);
           </div>

           <div className={`transition-opacity duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-10'}`}>
             <span className="text-blue-400">window</span>.location.<span className="text-blue-300">href</span> = <span className="text-green-400">`t.me/+${'{invite}'}`</span>;
           </div>

           <div className={`transition-opacity duration-300 ${step >= 4 ? 'opacity-100' : 'opacity-10'}`}>
             <span className="text-green-500">✔ Lead Joined &rarr; Sending CAPI Event...</span>
           </div>

        </div>
      </div>
    </div>
  );
}
