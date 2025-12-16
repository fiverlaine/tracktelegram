import { ArrowUpRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NeonCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subLabel?: string;
  subValue?: string;
  accent: string;
  shadow: string; // e.g. "shadow-blue-500/20"
}

export const NeonCard = ({ title, value, icon: Icon, subLabel, subValue, accent, shadow }: NeonCardProps) => (
  <div 
    className={cn(
      "relative w-full h-full rounded-2xl transition-all duration-300 group",
      "bg-gradient-to-br", // Base gradient class
      accent,              // "from-violet-600 to-fuchsia-600"
      "hover:shadow-2xl",   // Stronger shadow size
      `hover:${shadow.replace('/20', '/40')}`    // Stronger opacity on hover (40% vs 20%)
    )}
  >
    <div className="h-full w-full bg-white dark:bg-[#0a0a0a] rounded-2xl p-5 transition-transform duration-200 group-hover:scale-[0.98] flex flex-col justify-between border border-neutral-100 dark:border-white/5 z-10 relative">
      
      <div className="flex justify-between items-start mb-3">
        <div className={cn(
          "p-2.5 rounded-xl bg-gradient-to-br text-white shadow-lg",
          accent
        )}>
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-500 dark:text-gray-500 bg-neutral-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
          <ArrowUpRight size={10} />
          <span>+2.4%</span>
        </div>
      </div>

      <div>
        <h3 className="text-neutral-500 dark:text-gray-400 text-xs font-medium mb-0.5">{title}</h3>
        <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">{value}</div>
        
        {subLabel && (
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-white/5">
            <span className="text-[10px] text-neutral-500 dark:text-gray-500 font-medium uppercase tracking-wide">{subLabel}</span>
            <span className={cn(
              "text-xs font-bold bg-gradient-to-r bg-clip-text text-transparent",
              accent
            )}>
              {subValue}
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
);
