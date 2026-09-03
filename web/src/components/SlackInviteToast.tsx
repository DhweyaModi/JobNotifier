"use client";

import React, { useState, useEffect } from "react";
import { X, ExternalLink, MessageSquare, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const SLACK_INVITE_URL =
  process.env.NEXT_PUBLIC_SLACK_INVITE_URL ||
  "https://join.slack.com/t/job-notifier-group/shared_invite/zt-462dtvl76-u9J_OAjtfs0Q38oTXhKHjg";

export const SlackInviteToast: React.FC = () => {
  const { user, guestName, loading } = useAuth();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (loading) return;

    // Registered users (Google / Email): check permanent localStorage
    if (user) {
      try {
        const permanentDismissed = localStorage.getItem("jobnotifier_slack_toast_seen");
        if (permanentDismissed) {
          setIsDismissed(true);
          return;
        }
      } catch (e) {}
    } else {
      // Guests and visitors: show every time they open the site (session check only)
      try {
        const sessionDismissed = sessionStorage.getItem("jobnotifier_slack_toast_session_dismissed");
        if (sessionDismissed) {
          setIsDismissed(true);
          return;
        }
      } catch (e) {}
    }

    // Softly reveal 5 seconds after opening the site
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, guestName, loading]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    try {
      if (user) {
        // Permanently dismiss for registered users
        localStorage.setItem("jobnotifier_slack_toast_seen", "true");
      } else {
        // Session-only dismiss for guests (will reappear next time they open the site)
        sessionStorage.setItem("jobnotifier_slack_toast_session_dismissed", "true");
      }
    } catch (e) {}
  };

  if (!isVisible || isDismissed) return null;

  return (
    <aside
      aria-label="Slack Community Invite"
      className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] bg-slate-900/95 border border-purple-500/40 rounded-3xl p-5 shadow-2xl shadow-purple-950/70 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-700"
    >
      {/* Glow highlight */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3.5 right-3.5 p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3.5">
        {/* Slack Logo Icon */}
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4A154B] via-[#611f69] to-[#ECB22E] flex items-center justify-center text-white shrink-0 shadow-md shadow-purple-950/50">
          <MessageSquare className="w-5 h-5" />
        </div>

        <div className="space-y-2 pr-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Real-Time Alerts
            </span>
          </div>

          {/* Catchy Hook in Distinct Font Style */}
          <p className="text-xs font-semibold text-amber-300 italic leading-snug">
            &ldquo;Tired of job boards spamming your email inbox with junk you never open?&rdquo;
          </p>

          <p className="text-[12px] text-slate-300 leading-relaxed">
            Join our Slack community to get instant notifications the millisecond tech & AI internships drop, so you never miss a thing.
          </p>

          {/* Action Buttons */}
          <div className="pt-1 flex items-center gap-2">
            <a
              href={SLACK_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDismiss}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition cursor-pointer"
            >
              <span>Join Slack Community</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
