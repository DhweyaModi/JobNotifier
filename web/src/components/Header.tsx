"use client";

import React, { useState } from "react";
import { LayoutDashboard, CheckSquare, RefreshCw, LogOut, LogIn, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { SlackCommunityModal } from "@/components/SlackCommunityModal";
import { AppLogo } from "@/components/AppLogo";

interface HeaderProps {
  activeTab: "home" | "feed" | "tracker";
  setActiveTab: (tab: "home" | "feed" | "tracker") => void;
  totalJobs: number;
  trackedCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  authModalOpen?: boolean;
  setAuthModalOpen?: (open: boolean) => void;
  slackModalOpen?: boolean;
  setSlackModalOpen?: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalJobs,
  trackedCount,
  onRefresh,
  isRefreshing,
  authModalOpen: externalAuthModalOpen,
  setAuthModalOpen: setExternalAuthModalOpen,
  slackModalOpen: externalSlackModalOpen,
  setSlackModalOpen: setExternalSlackModalOpen,
}) => {
  const { user, guestName, signOut, loading: authLoading } = useAuth();
  const [internalAuthModalOpen, setInternalAuthModalOpen] = useState(false);
  const [internalSlackModalOpen, setInternalSlackModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const authModalOpen = externalAuthModalOpen !== undefined ? externalAuthModalOpen : internalAuthModalOpen;
  const setAuthModalOpen = setExternalAuthModalOpen || setInternalAuthModalOpen;

  const slackModalOpen = externalSlackModalOpen !== undefined ? externalSlackModalOpen : internalSlackModalOpen;
  const setSlackModalOpen = setExternalSlackModalOpen || setInternalSlackModalOpen;

  const userEmail = user?.email || "";
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (userEmail ? userEmail.split("@")[0] : guestName || "Guest");
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#050506]/85 backdrop-blur-xl border-b border-white/[0.06] px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveTab("home")}
              className="flex items-center gap-3 text-left cursor-pointer group"
            >
              <AppLogo size="md" showLivePulse={false} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-xl font-bold tracking-tight text-[#EDEDEF] group-hover:text-[#FFD600] transition">
                    JobNotifier
                  </h1>
                  <span className="w-2 h-2 rounded-full bg-[#F7931A] animate-yellow-pulse" title="Live sync" />
                </div>
                <p className="text-xs font-mono text-[#8A8F98] tracking-wide">
                  Live Tech & AI Internships
                </p>
              </div>
            </button>

            {/* Mobile Sync */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="md:hidden flex items-center justify-center p-2.5 rounded-full bg-white/5 border border-white/[0.08] text-sky-400 hover:text-white transition disabled:opacity-50"
              title="Refresh jobs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
            </button>
          </div>

          {/* Navigation & Actions */}
          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4">
            {/* Tabs */}
            <nav className="flex items-center gap-1 bg-[#0a0a0c]/90 p-1.5 rounded-full border border-white/[0.06] backdrop-blur-md">
              <button
                onClick={() => setActiveTab("home")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer ${
                  activeTab === "home"
                    ? "bg-white/[0.08] text-[#EDEDEF] shadow-inner border border-white/10"
                    : "text-[#8A8F98] hover:text-[#EDEDEF]"
                }`}
              >
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab("feed")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer ${
                  activeTab === "feed"
                    ? "bg-white/[0.08] text-[#EDEDEF] shadow-inner border border-white/10"
                    : "text-[#8A8F98] hover:text-[#EDEDEF]"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                <span>Live Scraper</span>
                {totalJobs > 0 && (
                  <span className="ml-0.5 text-xs font-mono font-bold px-2 py-0.5 bg-[#5E6AD2] text-white rounded-full shadow-[0_0_12px_rgba(94,106,210,0.45)]">
                    {totalJobs}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("tracker")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer ${
                  activeTab === "tracker"
                    ? "bg-white/[0.08] text-[#EDEDEF] shadow-inner border border-white/10"
                    : "text-[#8A8F98] hover:text-[#EDEDEF]"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Applications</span>
                <span className="sm:hidden">Saved</span>
                {trackedCount > 0 && (
                  <span className="ml-0.5 text-xs font-mono font-bold px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full">
                    {trackedCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Join Slack Button (Gold Pill CTA) */}
            <button
              onClick={() => setSlackModalOpen(true)}
              className="btn-gold-pill px-4 sm:px-5 py-2 text-xs sm:text-sm cursor-pointer shrink-0 font-bold"
            >
              Join Slack
            </button>

            {/* Avatar Button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3.5 rounded-full bg-white/5 border border-white/10 hover:border-amber-500/40 transition cursor-pointer"
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 text-xs font-bold font-display">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-200 max-w-[110px] truncate hidden sm:inline">
                    {userName}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#0B1120]/95 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl animate-in fade-in duration-150">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="text-xs font-bold text-white truncate font-display">{userName}</p>
                      <p className="text-xs text-slate-400 truncate font-mono">{userEmail}</p>
                    </div>

                    {/* Sync Option in Blue */}
                    <button
                      onClick={() => {
                        onRefresh();
                        setUserDropdownOpen(false);
                      }}
                      disabled={isRefreshing}
                      className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-medium text-sky-400 hover:bg-sky-500/10 rounded-xl transition cursor-pointer font-mono"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
                      <span>Sync Latest Listings</span>
                    </button>

                    <button
                      onClick={() => {
                        signOut();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer font-mono"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : guestName ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 border border-white/10 hover:border-amber-500/40 transition cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-slate-200 max-w-[110px] truncate">
                    {guestName}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#0B1120]/95 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl animate-in fade-in duration-150">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="text-xs font-bold text-white truncate font-display">{guestName}</p>
                      <p className="text-xs text-slate-400 font-mono">Guest Visitor</p>
                    </div>

                    {/* Sync Option in Blue */}
                    <button
                      onClick={() => {
                        onRefresh();
                        setUserDropdownOpen(false);
                      }}
                      disabled={isRefreshing}
                      className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-medium text-sky-400 hover:bg-sky-500/10 rounded-xl transition cursor-pointer font-mono"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
                      <span>Sync Latest Listings</span>
                    </button>

                    <button
                      onClick={() => {
                        setAuthModalOpen(true);
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/10 rounded-xl transition cursor-pointer font-mono"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In / Switch</span>
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer font-mono"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Clear Guest</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-amber-500/40 text-slate-200 text-sm font-semibold transition cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
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

      {/* Sign In / Sign Up / Guest Entry Modal */}
      <AuthModal
        isOpen={authModalOpen || (!authLoading && !user && !guestName)}
        onClose={() => setAuthModalOpen(false)}
        isMandatory={!authLoading && !user && !guestName}
      />
    </>
  );
};
