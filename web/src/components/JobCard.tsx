"use client";

import React from "react";
import { Job, ApplicationStatus } from "@/lib/types";
import { MapPin, ExternalLink, Bookmark, CheckCircle2, Building2, Calendar, Clock } from "lucide-react";

interface JobCardProps {
  job: Job;
  onStatusChange: (jobId: string, status: ApplicationStatus) => void;
  isBookmarked: boolean;
  onToggleBookmark: (jobId: string) => void;
  onSelectCountry?: (country: string) => void;
}

function formatExactTime(scrapedAt?: string, createdAt?: string, postedTimestamp?: number): string {
  const raw = scrapedAt || createdAt;
  if (raw) {
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }
    } catch {}
  }
  if (postedTimestamp && postedTimestamp > 0) {
    try {
      const d = new Date(postedTimestamp * 1000);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }
    } catch {}
  }
  return "Exact time pending";
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onStatusChange,
  isBookmarked,
  onToggleBookmark,
  onSelectCountry,
}) => {
  const getCountryBadge = (country: string) => {
    switch (country) {
      case "canada":
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCountry?.("canada");
            }}
            title="Click to filter by Canada channel"
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-950/80 hover:bg-red-900/90 text-red-300 hover:text-red-100 border border-red-800/60 shadow-sm transition cursor-pointer"
          >
            🇨🇦 Canada
          </button>
        );
      case "usa":
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCountry?.("usa");
            }}
            title="Click to filter by USA channel"
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950/80 hover:bg-blue-900/90 text-blue-300 hover:text-blue-100 border border-blue-800/60 shadow-sm transition cursor-pointer"
          >
            🇺🇸 USA
          </button>
        );
      case "both":
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCountry?.("both");
            }}
            title="Click to filter by Cross-Border channel"
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950/80 hover:bg-indigo-900/90 text-cyan-300 hover:text-cyan-100 border border-indigo-700/60 shadow-sm transition cursor-pointer"
          >
            🇨🇦🇺🇸 Cross-Border
          </button>
        );
      default:
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCountry?.("other");
            }}
            title="Click to filter by International"
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
          >
            🌍 International
          </button>
        );
    }
  };

  const getStatusColor = (status?: ApplicationStatus) => {
    switch (status) {
      case "APPLIED":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "INTERVIEWING":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "OFFER":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "REJECTED":
        return "bg-red-500/20 text-red-300 border-red-500/40";
      case "SAVED":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  // Generate company initial logo color deterministically
  const getCompanyColor = (company: string) => {
    const colors = [
      "from-indigo-600 to-blue-600",
      "from-cyan-600 to-teal-600",
      "from-violet-600 to-purple-600",
      "from-amber-600 to-orange-600",
      "from-emerald-600 to-green-600",
      "from-rose-600 to-pink-600",
    ];
    let hash = 0;
    for (let i = 0; i < company.length; i++) {
      hash = company.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const exactScrapedTime = formatExactTime(job.scrapedAt, job.createdAt, job.postedTimestamp);

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between relative group">
      <div>
        {/* Card Header: Company Logo, Country Badge, Bookmark */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getCompanyColor(
                job.company
              )} flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0`}
            >
              {job.company.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5 line-clamp-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{job.company}</span>
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                {getCountryBadge(job.country)}
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 line-clamp-1">
                  {job.source}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleBookmark(job.id)}
            className={`p-2 rounded-xl transition ${
              isBookmarked
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
            title={isBookmarked ? "Remove Bookmark" : "Save Job"}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-amber-400" : ""}`} />
          </button>
        </div>

        {/* Job Title */}
        <h3 className="text-base font-bold text-white mb-2 leading-snug group-hover:text-indigo-300 transition line-clamp-2">
          {job.title}
        </h3>

        {/* Location & Exact Scraped Timestamp */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-4">
          <span className="flex items-center gap-1.5 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{job.location || "Location Not Specified"}</span>
          </span>

          <span
            suppressHydrationWarning
            title={`Exact Scraped Timestamp: ${job.scrapedAt || job.createdAt || exactScrapedTime}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-800/60 shrink-0 shadow-sm"
          >
            <Clock className="w-3 h-3 text-emerald-400" />
            <span suppressHydrationWarning>{exactScrapedTime}</span>
          </span>
        </div>
      </div>

      {/* Footer Controls: Apply Link & Status Selector */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={job.applicationStatus || "NONE"}
            onChange={(e) =>
              onStatusChange(job.id, e.target.value as ApplicationStatus)
            }
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border appearance-none pr-6 cursor-pointer focus:outline-none transition ${getStatusColor(
              job.applicationStatus
            )}`}
          >
            <option value="NONE" className="bg-slate-900 text-slate-300">Status: Unsaved</option>
            <option value="SAVED" className="bg-slate-900 text-purple-300">Status: Saved</option>
            <option value="APPLIED" className="bg-slate-900 text-blue-300">Status: Applied</option>
            <option value="INTERVIEWING" className="bg-slate-900 text-amber-300">Status: Interviewing</option>
            <option value="OFFER" className="bg-slate-900 text-emerald-300">Status: Offer 🎉</option>
            <option value="REJECTED" className="bg-slate-900 text-red-300">Status: Rejected</option>
          </select>
        </div>

        {/* Apply Link Button */}
        {job.url && job.url !== "#" ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-500 hover:to-indigo-600 shadow-md shadow-indigo-600/20 transition shrink-0"
          >
            <span>Apply</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <span className="text-xs text-slate-500 italic px-2 py-1">No direct link</span>
        )}
      </div>
    </div>
  );
};
