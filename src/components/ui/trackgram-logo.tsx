import { cn } from "@/lib/utils";

export const TrackGramIcon = ({ size = 40, className }: { size?: number, className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("shrink-0", className)}
  >
    <defs>
      <linearGradient id="tg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <filter id="tg-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" stroke="url(#tg-grad)" strokeWidth="1.5" fill="none" opacity="0.25" />
    <circle cx="50" cy="50" r="35" stroke="url(#tg-grad)" strokeWidth="2" fill="none" opacity="0.45" />
    <circle cx="50" cy="50" r="25" stroke="url(#tg-grad)" strokeWidth="2.5" fill="none" opacity="0.7" />
    <path d="M25 50L70 28L55 72L46 52L25 50Z" fill="url(#tg-grad)" filter="url(#tg-glow)" />
  </svg>
);

export const TrackGramLogo = ({ 
  iconSize = 50, 
  textSize = 24, 
  className 
}: { 
  iconSize?: number, 
  textSize?: number,
  className?: string 
}) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <TrackGramIcon size={iconSize} />
      <div 
        className="flex flex-col justify-center leading-[0.85]" 
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <span 
          className="font-bold text-[#A855F7] tracking-tight"
          style={{ fontSize: textSize }}
        >
          Track
        </span>
        <span 
          className="font-light text-neutral-900 dark:text-white tracking-tight transition-colors duration-300"
          style={{ fontSize: textSize }}
        >
          Gram
        </span>
      </div>
    </div>
  );
};
