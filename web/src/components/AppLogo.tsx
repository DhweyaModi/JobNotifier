import React from "react";

interface AppLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showLivePulse?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = "md",
  className = "",
  showLivePulse = false,
}) => {
  const sizeMap = {
    sm: "w-10 h-10 rounded-xl",
    md: "w-14 h-14 rounded-2xl",
    lg: "w-20 h-20 rounded-3xl",
    xl: "w-28 h-28 rounded-3xl",
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <div
        className={`relative overflow-hidden bg-[#09080F] border border-purple-500/50 shadow-2xl shadow-purple-950/60 transition-all duration-200 hover:scale-105 hover:border-purple-400/80 p-0.5 flex items-center justify-center ${sizeMap[size]}`}
      >
        {/* Edge-to-edge cropped SVG of Violet Bell with Yellow Lightning Bolt */}
        <svg
          viewBox="25 10 200 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-lg"
        >
          {/* Radar Pulse Rings */}
          <ellipse cx="125" cy="172" rx="98" ry="32" fill="none" stroke="#7C3AED" strokeWidth="2.2" opacity="0.35" />
          <ellipse cx="125" cy="172" rx="74" ry="24" fill="none" stroke="#8B5CF6" strokeWidth="2.6" opacity="0.5" />
          <ellipse cx="125" cy="172" rx="50" ry="16" fill="none" stroke="#7C3AED" strokeWidth="3" opacity="0.65" />

          {/* Bell Body */}
          <path
            d="M125 38 C125 38 78 88 75 140 L75 172 L175 172 L175 140 C172 88 125 38 125 38Z"
            fill="#110D1F"
            stroke="#8B5CF6"
            strokeWidth="4"
          />
          <path
            d="M95 140 C95 108 108 78 125 62 C142 78 155 108 155 140"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2.2"
            opacity="0.7"
          />

          {/* Base Rim & Nodes */}
          <rect x="60" y="170" width="130" height="10" rx="5" fill="#1A1230" stroke="#8B5CF6" strokeWidth="3" />
          <circle cx="75" cy="172" r="5" fill="#8B5CF6" />
          <circle cx="175" cy="172" r="5" fill="#8B5CF6" />
          <circle cx="75" cy="140" r="4" fill="#8B5CF6" opacity="0.8" />
          <circle cx="175" cy="140" r="4" fill="#8B5CF6" opacity="0.8" />

          {/* Top Ring & Clapper */}
          <line x1="125" y1="18" x2="125" y2="38" stroke="#8B5CF6" strokeWidth="4" />
          <circle cx="125" cy="16" r="7.5" fill="none" stroke="#8B5CF6" strokeWidth="4" />
          <circle cx="125" cy="187" r="11" fill="#1A1230" stroke="#8B5CF6" strokeWidth="3.5" />

          {/* Amber Yellow Lightning Bolt */}
          <polygon
            points="131,64 113,105 125,105 116,150 141,108 129,108 139,64"
            fill="#FBBF24"
          />
          <polygon
            points="131,64 113,105 125,105 116,150 141,108 129,108 139,64"
            fill="#FEF08A"
            opacity="0.45"
          />
        </svg>
      </div>

      {showLivePulse && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950"></span>
        </span>
      )}
    </div>
  );
};
