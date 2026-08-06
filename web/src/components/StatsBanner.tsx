"use client";

import React from "react";
import { Job } from "@/lib/types";
import { Globe, MapPin, CheckCircle2, Zap } from "lucide-react";

interface StatsBannerProps {
  jobs: Job[];
  trackedCount: number;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ jobs, trackedCount }) => {
  const canadaCount = jobs.filter((j) => j.country === "canada").length;
  const usaCount = jobs.filter((j) => j.country === "usa").length;
  const bothCount = jobs.filter((j) => j.country === "both").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Scraped Jobs */}
      <div className="glass-card p-4 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-indigo-400">
          <Zap className="w-16 h-16" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Total Scraped Jobs
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl lg:text-3xl font-black text-white font-mono">
            {jobs.length}
          </h3>
          <span className="text-xs text-emerald-400 font-medium">Verified</span>
        </div>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          All scrapers active & filtered
        </p>
      </div>

      {/* Canada Feed */}
      <div className="glass-card p-4 rounded-2xl relative overflow-hidden group border-l-4 border-l-red-500">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-red-400">
          <MapPin className="w-16 h-16" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <span>Canada Channel</span>
          <span>🇨🇦</span>
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl lg:text-3xl font-black text-white font-mono">
            {canadaCount}
          </h3>
          <span className="text-xs text-red-300 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/40">
            Strict Filter
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Toronto, BC, Waterloo & Remote CA
        </p>
      </div>

      {/* USA Feed */}
      <div className="glass-card p-4 rounded-2xl relative overflow-hidden group border-l-4 border-l-blue-500">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-blue-400">
          <MapPin className="w-16 h-16" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <span>USA Channel</span>
          <span>🇺🇸</span>
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl lg:text-3xl font-black text-white font-mono">
            {usaCount}
          </h3>
          <span className="text-xs text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
            Strict Filter
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          SF, NYC, Seattle, Austin & Remote US
        </p>
      </div>

      {/* Cross-Border & Tracked */}
      <div className="glass-card p-4 rounded-2xl relative overflow-hidden group border-l-4 border-l-indigo-500">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition text-indigo-400">
          <Globe className="w-16 h-16" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Cross-Border & Applications
        </p>
        <div className="flex items-baseline gap-3">
          <div>
            <span className="text-xs text-slate-400 block">Cross-Border</span>
            <span className="text-xl font-bold text-cyan-400 font-mono">{bothCount}</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div>
            <span className="text-xs text-slate-400 block">Tracked</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{trackedCount}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-indigo-400" />
          Status pipeline active
        </p>
      </div>
    </div>
  );
};
