import React from "react";
import Image from "next/image";

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
    sm: "w-8 h-8 rounded-xl",
    md: "w-10 h-10 rounded-2xl",
    lg: "w-14 h-14 rounded-2xl",
    xl: "w-20 h-20 rounded-3xl",
  };

  const imagePixelMap = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <div
        className={`relative overflow-hidden bg-[#09080F] border border-violet-500/30 shadow-lg shadow-purple-950/40 transition-transform duration-200 hover:scale-105 ${sizeMap[size]}`}
      >
        <Image
          src="/logo.png"
          alt="JobNotifier Logo"
          width={imagePixelMap[size]}
          height={imagePixelMap[size]}
          className="w-full h-full object-cover"
          priority
        />
      </div>

      {showLivePulse && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-slate-950"></span>
        </span>
      )}
    </div>
  );
};
