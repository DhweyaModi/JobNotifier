"use client";

import React from "react";
import { Job } from "@/lib/types";

interface StatsBannerProps {
  jobs: Job[];
  trackedCount: number;
  selectedCountries?: string[];
  onSelectCountry?: (country: string) => void;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  jobs,
  trackedCount,
  selectedCountries = [],
  onSelectCountry,
}) => {
  const canadaCount = jobs.filter((j) => j.country === "canada").length;
  const usaCount = jobs.filter((j) => j.country === "usa").length;
  const bothCount = jobs.filter((j) => j.country === "both").length;

  const isAllSelected = selectedCountries.length === 0;
  const isCanadaSelected = selectedCountries.includes("canada");
  const isUsaSelected = selectedCountries.includes("usa");
  const isBothSelected = selectedCountries.includes("both");

  const handleCardClick = (country: string) => {
    if (!onSelectCountry) return;
    onSelectCountry(country);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
      {/* 1. All Jobs */}
      <button
        onClick={() => handleCardClick("all")}
        className={`glass-panel glass-panel-hover p-6 rounded-2xl text-left transition-all cursor-pointer relative ${
          isAllSelected
            ? "border-2 border-[#5E6AD2] ring-2 ring-[#5E6AD2]/50 shadow-[0_0_30px_rgba(94,106,210,0.45)] bg-white/[0.08]"
            : "border border-white/[0.06] hover:border-white/20"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-semibold text-[#8A8F98] uppercase tracking-wider">
            ALL JOBS
          </span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold transition ${
              isAllSelected
                ? "bg-[#5E6AD2] text-white shadow-sm"
                : "text-[#8A8F98] bg-white/5"
            }`}
          >
            {isAllSelected ? "ACTIVE" : "FILTER"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 my-1">
          <h3 className="font-display text-5xl font-bold text-white tracking-tight">
            {jobs.length}
          </h3>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-yellow-pulse" title="Live updating" />
        </div>
        <p className="text-sm text-[#8A8F98] mt-2 font-body">
          Real-time opportunities feed
        </p>
      </button>

      {/* 2. Canada Channel (Amber Accent) */}
      <button
        onClick={() => handleCardClick("canada")}
        className={`glass-panel glass-panel-hover p-6 rounded-2xl text-left transition-all cursor-pointer relative ${
          isCanadaSelected
            ? "border-2 border-[#F7931A] ring-2 ring-[#F7931A]/50 shadow-[0_0_30px_rgba(247,147,26,0.45)] bg-white/[0.08]"
            : "border border-white/[0.06] hover:border-white/20"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-semibold text-[#8A8F98] uppercase tracking-wider">
            CANADA CHANNEL
          </span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold transition ${
              isCanadaSelected
                ? "bg-[#F7931A] text-black shadow-sm"
                : "text-[#8A8F98] bg-white/5"
            }`}
          >
            {isCanadaSelected ? "ACTIVE" : "FILTER"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 my-1">
          <h3 className="font-display text-5xl font-bold text-white tracking-tight">
            {canadaCount}
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Strict Filter
          </span>
        </div>
        <p className="text-sm text-[#8A8F98] mt-2 font-body">
          Toronto, BC, Waterloo & CA Remote
        </p>
      </button>

      {/* 3. USA Channel (Cyan Accent) */}
      <button
        onClick={() => handleCardClick("usa")}
        className={`glass-panel glass-panel-hover p-6 rounded-2xl text-left transition-all cursor-pointer relative ${
          isUsaSelected
            ? "border-2 border-sky-400 ring-2 ring-sky-400/50 shadow-[0_0_30px_rgba(56,189,248,0.45)] bg-white/[0.08]"
            : "border border-white/[0.06] hover:border-white/20"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-semibold text-[#8A8F98] uppercase tracking-wider">
            USA CHANNEL
          </span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold transition ${
              isUsaSelected
                ? "bg-sky-400 text-black shadow-sm"
                : "text-[#8A8F98] bg-white/5"
            }`}
          >
            {isUsaSelected ? "ACTIVE" : "FILTER"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 my-1">
          <h3 className="font-display text-5xl font-bold text-white tracking-tight">
            {usaCount}
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            Strict Filter
          </span>
        </div>
        <p className="text-sm text-[#8A8F98] mt-2 font-body">
          SF, NYC, Seattle & US Remote
        </p>
      </button>

      {/* 4. Cross-Border & Tracked */}
      <button
        onClick={() => handleCardClick("both")}
        className={`glass-panel glass-panel-hover p-6 rounded-2xl text-left transition-all cursor-pointer relative ${
          isBothSelected
            ? "border-2 border-indigo-400 ring-2 ring-indigo-400/50 shadow-[0_0_30px_rgba(129,140,248,0.45)] bg-white/[0.08]"
            : "border border-white/[0.06] hover:border-white/20"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-semibold text-[#8A8F98] uppercase tracking-wider">
            CROSS-BORDER & TRACKED
          </span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold transition ${
              isBothSelected
                ? "bg-indigo-400 text-white shadow-sm"
                : "text-[#8A8F98] bg-white/5"
            }`}
          >
            {isBothSelected ? "ACTIVE" : "FILTER"}
          </span>
        </div>
        <div className="flex items-center gap-3 my-1">
          <div className="flex items-baseline gap-1.5">
            <h3 className="font-display text-5xl font-bold text-white tracking-tight">
              {bothCount}
            </h3>
            <span className="text-xs font-mono text-[#8A8F98]">Dual</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-baseline gap-1.5">
            <h3 className="font-display text-5xl font-bold text-white tracking-tight">
              {trackedCount}
            </h3>
            <span className="text-xs font-mono text-[#8A8F98]">Tracked</span>
          </div>
        </div>
        <p className="text-sm text-[#8A8F98] mt-2 font-body">
          Eligible for US & CA applicants
        </p>
      </button>
    </div>
  );
};
