"use client";

import React from "react";
import { Briefcase, Bell, LayoutDashboard, CheckSquare, Settings, RefreshCw } from "lucide-react";

interface HeaderProps {
  activeTab: "feed" | "tracker" | "settings";
  setActiveTab: (tab: "feed" | "tracker" | "settings") => void;
  totalJobs: number;
  trackedCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalJobs,
  trackedCount,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
              <Briefcase className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                JobNotifier <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">v2.0</span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Scraper Filtering Active • Live Sync
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="md:hidden flex items-center justify-center p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Refresh jobs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>

        {/* Tab Navigation & Controls */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === "feed"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Job Feed</span>
              {totalJobs > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.2 bg-indigo-950 text-indigo-300 rounded-full font-mono">
                  {totalJobs}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("tracker")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === "tracker"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Applications</span>
              {trackedCount > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded-full font-mono">
                  {trackedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === "settings"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </button>
          </nav>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700/60 hover:border-slate-600 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
};
