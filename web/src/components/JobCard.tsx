"use client";

import React from "react";
import { Job, ApplicationStatus } from "@/lib/types";
import {
  ExternalLink,
  MapPin,
  Clock,
  Bookmark,
} from "lucide-react";

interface JobCardProps {
  job: Job;
  onStatusChange: (jobId: string, status: ApplicationStatus) => void;
  isBookmarked: boolean;
  onToggleBookmark: (jobId: string) => void;
  onSelectCountry?: (country: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onStatusChange,
  isBookmarked,
  onToggleBookmark,
  onSelectCountry,
}) => {
  const formatExactTime = (
    scrapedAt?: string,
    createdAt?: string,
    postedTimestamp?: number
  ) => {
    try {
      const dateStr = scrapedAt || createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
        }
      }
      if (postedTimestamp && postedTimestamp > 0) {
        const d = new Date(postedTimestamp * 1000);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
        }
      }
    } catch (e) {}
    return "Recent";
  };

  const getCountryFlag = (country: string) => {
    switch (country) {
      case "canada":
        return "🇨🇦";
      case "usa":
        return "🇺🇸";
      case "both":
        return "🇨🇦/🇺🇸";
      default:
        return "🌍";
    }
  };

  const getStatusColor = (status?: ApplicationStatus) => {
    switch (status) {
      case "APPLIED":
        return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
      case "INTERVIEWING":
        return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
      case "OFFER":
        return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
      case "REJECTED":
        return "bg-rose-500/15 text-rose-400 border border-rose-500/30";
      case "SAVED":
        return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
      default:
        return "bg-white/5 text-slate-400 border border-white/10";
    }
  };

  const exactScrapedTime = formatExactTime(
    job.scrapedAt,
    job.createdAt,
    job.postedTimestamp
  );

  const HIGH_TECH_COMPANIES = new Set(["google", "microsoft"]);

  const isHighTech =
    job.source === "Google" ||
    job.source === "Microsoft" ||
    HIGH_TECH_COMPANIES.has(job.company.toLowerCase().trim());

  const isNewGrad = Boolean(job.source && /new-?grad/i.test(job.source));

  return (
    <div
      className="glass-panel job-card-halo rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative group"
    >
      <div>
        {/* Card Header: 40px Avatar + Company + Flag + Badges + Bookmark */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white font-display font-bold text-base shrink-0 shadow-sm">
              {job.company.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display text-[15px] font-bold text-white line-clamp-1">
                  {job.company}
                </h4>
                {/* 16px Flag */}
                <span className="text-base shrink-0" title={`Region: ${job.country}`}>
                  {getCountryFlag(job.country)}
                </span>
                {isNewGrad ? (
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0 shadow-[0_0_10px_rgba(79,70,229,0.2)]">
                    🚀 New Grad
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                    🎓 Intern
                  </span>
                )}
                {isHighTech && (
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    High Tech
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleBookmark(job.id)}
            className={`p-2 rounded-full transition cursor-pointer border ${
              isBookmarked
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
                : "bg-white/5 text-slate-400 hover:text-white border-white/10"
            }`}
            title={isBookmarked ? "Remove Bookmark" : "Save Job"}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-amber-400" : ""}`} />
          </button>
        </div>

        {/* Space Grotesk Bold Job Title */}
        <h3 className="font-display text-[17px] font-bold text-white mb-2 leading-snug line-clamp-2">
          {job.title}
        </h3>

        {/* Location & Timestamp with JetBrains Mono */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="text-sm text-slate-400 flex items-center gap-1.5 line-clamp-1 font-body">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{job.location || "Location Not Specified"}</span>
          </span>

          <span
            suppressHydrationWarning
            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25 shrink-0"
            title={`Scraped: ${job.scrapedAt || job.createdAt || exactScrapedTime}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span suppressHydrationWarning>{exactScrapedTime}</span>
          </span>
        </div>
      </div>

      {/* Footer Controls: Status Dropdown & Purple Apply CTA */}
      <div className="pt-3.5 border-t border-white/10 flex items-center justify-between gap-3">
        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={job.applicationStatus || "NONE"}
            onChange={(e) =>
              onStatusChange(job.id, e.target.value as ApplicationStatus)
            }
            className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-full appearance-none pr-7 cursor-pointer outline-none transition ${getStatusColor(
              job.applicationStatus
            )}`}
          >
            <option value="NONE" className="bg-[#0B1120] text-slate-300">Status: Unsaved</option>
            <option value="SAVED" className="bg-[#0B1120] text-amber-300">Status: Saved</option>
            <option value="APPLIED" className="bg-[#0B1120] text-emerald-300">Status: Applied</option>
            <option value="INTERVIEWING" className="bg-[#0B1120] text-amber-300">Status: Interviewing</option>
            <option value="OFFER" className="bg-[#0B1120] text-emerald-300">Status: Offer 🎉</option>
            <option value="REJECTED" className="bg-[#0B1120] text-rose-300">Status: Rejected</option>
          </select>
        </div>

        {/* Purple Pill Apply Link Button */}
        {job.url && job.url !== "#" ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-purple-pill inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 cursor-pointer shrink-0"
          >
            <span>Apply</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <span className="text-xs text-slate-500 italic px-2 py-1 font-mono">No direct link</span>
        )}
      </div>
    </div>
  );
};
