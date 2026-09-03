"use client";

import React from "react";
import { X, ExternalLink, Zap, MapPin, Sparkles, MessageSquare, Users, ShieldCheck } from "lucide-react";

interface SlackCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlackCommunityModal: React.FC<SlackCommunityModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  // Use environment variable or fallback link
  const slackInviteUrl =
    process.env.NEXT_PUBLIC_SLACK_INVITE_URL ||
    "https://join.slack.com/t/job-notifier-group/shared_invite/zt-462dtvl76-u9J_OAjtfs0Q38oTXhKHjg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4A154B] via-[#611f69] to-[#ECB22E] text-white shadow-xl shadow-purple-950/50 mb-1">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Join the JobNotifier Slack Community
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Get instant real-time alerts the second new tech internships open, before they fill up.
          </p>
        </div>

        {/* Community Channels Breakdown */}
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-indigo-950/40 border border-amber-500/40 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-200">#high-tech-internships 🚀</h4>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                  NEW
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Direct postings from Google, Big Tech, Top AI Labs (OpenAI, Anthropic), and Quant Trading firms.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-200">#canada-internships 🇨🇦</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Strict Canada-only feed for Toronto, Waterloo, Vancouver, Montreal & Remote CA.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-200">#usa-internships 🇺🇸</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                USA engineering & data internships across SF, NYC, Seattle, Austin & Remote US.
              </p>
            </div>
          </div>
        </div>

        {/* Join CTA Button */}
        <div className="pt-2">
          <a
            href={slackInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#4A154B] via-[#611f69] to-[#7c2886] hover:from-[#611f69] hover:to-[#4A154B] text-white font-bold text-sm shadow-xl shadow-purple-950/60 border border-purple-400/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>Join Slack Workspace Now</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-[11px] text-center text-slate-500 mt-2.5 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Free • Instant access to all live notification channels</span>
          </p>
        </div>
      </div>
    </div>
  );
};
