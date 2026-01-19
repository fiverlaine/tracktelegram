import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NeonCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subLabel?: string;
  subValue?: string;
  uniqueValue?: string | number;
  accent: string;
  shadow: string;
}

export const NeonCard = ({ title, value, icon: Icon, subLabel, subValue, uniqueValue, accent, shadow }: NeonCardProps) => {
  // Extract the main color from the accent gradient for icon coloring
  const iconColorMap: Record<string, string> = {
    "from-blue-500 to-cyan-400": "text-blue-500",
    "from-amber-400 to-orange-500": "text-amber-500",
    "from-emerald-400 to-green-500": "text-emerald-500",
    "from-rose-500 to-pink-500": "text-rose-500",
  };
  
  const iconColor = iconColorMap[accent] || "text-violet-500";

  return (
    <div 
      className={cn(
        "relative w-full h-full rounded-2xl transition-all duration-300 group",
        "hover:shadow-xl",
        shadow
      )}
    >
      <div className="h-full w-full bg-white dark:bg-[#0a0a0a] rounded-2xl p-5 transition-transform duration-200 group-hover:scale-[0.99] flex flex-col justify-between border border-neutral-100 dark:border-white/5 z-10 relative">
        
        <div className="flex justify-between items-start mb-4">
          {/* Minimal Icon - no background box */}
          <div className={cn("opacity-60 group-hover:opacity-100 transition-opacity", iconColor)}>
            <Icon size={22} strokeWidth={1.5} />
          </div>
        </div>

        <div>
          <h3 className="text-neutral-500 dark:text-gray-400 text-xs font-medium mb-1">{title}</h3>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">{value}</div>
            {uniqueValue !== undefined && (
              <span className="text-[10px] text-neutral-400 dark:text-gray-500 font-medium">
                ({uniqueValue} únicos)
              </span>
            )}
          </div>
          
          <div className="mb-3" />
          
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
};
