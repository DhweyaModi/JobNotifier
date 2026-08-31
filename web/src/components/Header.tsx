"use client";

import React, { useState } from "react";
import { Briefcase, Bell, LayoutDashboard, CheckSquare, Settings, RefreshCw, User as UserIcon, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { SlackCommunityModal } from "@/components/SlackCommunityModal";

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
  const { user, signOut, loading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [slackModalOpen, setSlackModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userEmail = user?.email || "";
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || userEmail.split("@")[0] || "User";
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

  return (
    <>
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
                  Live Tech & AI Internships
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

            {/* Join Slack Community Button */}
            <button
              onClick={() => setSlackModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 text-purple-200 border border-purple-500/40 text-xs font-bold transition shadow-md shadow-purple-950/40 cursor-pointer"
            >
              <span className="text-sm">💬</span>
              <span className="hidden sm:inline">Join Slack</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700/60 hover:border-slate-600 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
              <span>Sync</span>
            </button>

            {/* User Auth Profile / Sign In */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition"
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-7 h-7 rounded-lg object-cover border border-indigo-500/30"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xs font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate hidden sm:inline">
                    {userName}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white truncate">{userName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/40 rounded-xl transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Slack Community Modal */}
      <SlackCommunityModal
        isOpen={slackModalOpen}
        onClose={() => setSlackModalOpen(false)}
      />

      {/* Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        isMandatory={false}
      />
    </>
  );
};

