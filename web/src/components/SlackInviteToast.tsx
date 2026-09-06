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

    if (user) {
      try {
        const permanentDismissed = localStorage.getItem("jobnotifier_slack_toast_seen");
        if (permanentDismissed) {
          setIsDismissed(true);
          return;
        }
      } catch (e) {}
    } else {
      try {
        const sessionDismissed = sessionStorage.getItem("jobnotifier_slack_toast_session_dismissed");
        if (sessionDismissed) {
          setIsDismissed(true);
          return;
        }
      } catch (e) {}
    }

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
        localStorage.setItem("jobnotifier_slack_toast_seen", "true");
      } else {
        sessionStorage.setItem("jobnotifier_slack_toast_session_dismissed", "true");
      }
    } catch (e) {}
  };

  if (!isVisible || isDismissed) return null;

  return (
    <aside
      aria-label="Slack Community Invite"
      className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] bg-[#0B1120]/95 border border-amber-500/30 rounded-3xl p-5 shadow-2xl shadow-black/80 backdrop-blur-2xl animate-in fade-in duration-300"
    >
      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950/40">
          <MessageSquare className="w-5 h-5" />
        </div>

        <div className="space-y-2 pr-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Real-Time Alerts
            </span>
          </div>

          <p className="text-sm font-display font-bold text-slate-100 leading-snug">
            &ldquo;Tired of job boards spamming your email inbox with junk you never open?&rdquo;
          </p>

          <p className="text-xs text-slate-400 leading-relaxed">
            Join our Slack community to get instant notifications the millisecond tech & AI internships drop, so you never miss a thing.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <a
              href={SLACK_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDismiss}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full btn-gold-pill font-bold text-xs shadow-lg transition cursor-pointer"
            >
              <span>Join Slack Community</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleDismiss}
              className="px-3.5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
