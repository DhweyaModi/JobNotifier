"use client";

import React from "react";
import { X, ExternalLink, Zap, MapPin, MessageSquare, ShieldCheck } from "lucide-react";

interface SlackCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlackCommunityModal: React.FC<SlackCommunityModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const slackInviteUrl =
    process.env.NEXT_PUBLIC_SLACK_INVITE_URL ||
    "https://join.slack.com/t/job-notifier-group/shared_invite/zt-462dtvl76-u9J_OAjtfs0Q38oTXhKHjg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-[#0B1120]/95 rounded-3xl p-6 sm:p-7 border border-white/15 shadow-2xl shadow-black/80 space-y-5 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-1 shadow-lg shadow-amber-950/40">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-bold text-slate-100 tracking-tight">
            Join the JobNotifier Slack Community
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Get instant real-time alerts the second new tech internships open, before they fill up.
          </p>
        </div>

        {/* Community Channels Breakdown */}
        <div className="space-y-2.5">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3 hover:border-amber-500/30 transition">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 shrink-0 mt-0.5 border border-amber-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-display font-bold text-slate-100">#high-tech-internships</h4>
                <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  FEATURED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct alerts for Google, Microsoft, and top tech engineering roles.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3 hover:border-amber-500/30 transition">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 shrink-0 mt-0.5 border border-amber-500/30">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-display font-bold text-slate-100">#canada-internships 🇨🇦</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Strict Canada-only feed for Toronto, Waterloo, Vancouver, Montreal & Remote CA.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3 hover:border-sky-500/30 transition">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-300 shrink-0 mt-0.5 border border-sky-500/30">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-display font-bold text-slate-100">#usa-internships 🇺🇸</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                USA engineering & data internships across SF, NYC, Seattle, Austin & Remote US.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-emerald-500/20 flex items-start gap-3 hover:border-emerald-500/40 transition">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300 shrink-0 mt-0.5 border border-emerald-500/30">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-display font-bold text-slate-100">#canada-new-grad 🇨🇦</h4>
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  NEW
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dedicated New Grad full-time entry-level tech roles in Canada.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-emerald-500/20 flex items-start gap-3 hover:border-emerald-500/40 transition">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300 shrink-0 mt-0.5 border border-emerald-500/30">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-display font-bold text-slate-100">#usa-new-grad 🇺🇸</h4>
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  NEW
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dedicated New Grad full-time entry-level tech roles across the USA.
              </p>
            </div>
          </div>
        </div>

        {/* Join CTA Button */}
        <div className="pt-1">
          <a
            href={slackInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-5 rounded-full btn-gold-pill font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>Join Slack Workspace</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-xs text-center text-slate-400 mt-2.5 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Free • Instant access to all live notification channels</span>
          </p>
        </div>
      </div>
    </div>
  );
};
