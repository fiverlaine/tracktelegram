export const TrackGramLogo = ({ size = 40 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Gradient Definitions */}
    <defs>
      <linearGradient id="trackgram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="50%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#D946EF" />
      </linearGradient>
      <linearGradient id="trackgram-glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#D946EF" stopOpacity="0.2" />
      </linearGradient>
    </defs>

    {/* Background Circle with gradient */}
    <rect
      x="2"
      y="2"
      width="44"
      height="44"
      rx="14"
      fill="url(#trackgram-gradient)"
    />

    {/* Telegram-inspired paper plane arrow - simplified & modern */}
    <path
      d="M14 24L32 16L28 32L22 26L14 24Z"
      fill="white"
      fillOpacity="0.95"
    />
    
    {/* Arrow accent line */}
    <path
      d="M22 26L24 32L28 32"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity="0.7"
    />

    {/* Analytics dot / tracking indicator */}
    <circle
      cx="32"
      cy="16"
      r="3"
      fill="white"
      opacity="0.9"
    />
  </svg>
);
