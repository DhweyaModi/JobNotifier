"use client";

import React from "react";
import { Job, ApplicationStatus } from "@/lib/types";
import { CheckSquare, ExternalLink, Trash2, Building2, MapPin } from "lucide-react";

interface ApplicationTrackerProps {
  jobs: Job[];
  onStatusChange: (jobId: string, status: ApplicationStatus) => void;
}

const COLUMNS: { id: ApplicationStatus; title: string; color: string; badgeColor: string }[] = [
  { id: "SAVED", title: "Saved / Bookmarked", color: "border-t-amber-500", badgeColor: "bg-amber-500/15 text-amber-300 border border-amber-500/30" },
  { id: "APPLIED", title: "Applied", color: "border-t-emerald-500", badgeColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  { id: "INTERVIEWING", title: "Interviewing", color: "border-t-amber-400", badgeColor: "bg-amber-500/15 text-amber-300 border border-amber-500/30" },
  { id: "OFFER", title: "Offer Extended", color: "border-t-emerald-400", badgeColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  { id: "REJECTED", title: "Rejected", color: "border-t-rose-500", badgeColor: "bg-rose-500/15 text-rose-400 border border-rose-500/30" },
];

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  jobs,
  onStatusChange,
}) => {
  const trackedJobs = jobs.filter((j) => j.applicationStatus && j.applicationStatus !== "NONE");

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <span>Job Application Pipeline</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-body">
            Organize and track your active applications across interview stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Total Tracked:</span>
          <span className="text-sm font-bold text-amber-300 font-mono bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
            {trackedJobs.length} Jobs
          </span>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colJobs = trackedJobs.filter((j) => j.applicationStatus === col.id);
          return (
            <div
              key={col.id}
              className={`glass-panel rounded-2xl p-4 border-t-4 ${col.color} flex flex-col min-h-[480px] shadow-lg`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/10">
                <h3 className="font-display text-sm font-bold text-white line-clamp-1">{col.title}</h3>
                <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold ${col.badgeColor}`}>
                  {colJobs.length}
                </span>
              </div>

              {/* Job List Cards in Column */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                {colJobs.length === 0 ? (
                  <div className="text-center py-12 px-2 text-slate-500 text-xs italic font-mono border border-dashed border-white/10 rounded-xl">
                    No jobs in {col.title.toLowerCase()}
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-slate-900/80 p-3.5 rounded-xl space-y-2 border border-white/10 hover:border-amber-500/40 hover:-translate-y-0.5 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-display">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          {job.company}
                        </span>
                        <button
                          onClick={() => onStatusChange(job.id, "NONE")}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                          title="Untrack application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="font-display text-sm font-bold text-white leading-snug line-clamp-2">
                        {job.title}
                      </h4>

                      <p className="text-xs text-slate-400 flex items-center gap-1 font-body">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {job.location}
                      </p>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        <select
                          value={job.applicationStatus}
                          onChange={(e) =>
                            onStatusChange(job.id, e.target.value as ApplicationStatus)
                          }
                          className="text-xs font-mono bg-[#0B1120] text-slate-200 border border-white/10 rounded-full px-2.5 py-1 focus:outline-none cursor-pointer"
                        >
                          <option value="SAVED">Saved</option>
                          <option value="APPLIED">Applied</option>
                          <option value="INTERVIEWING">Interviewing</option>
                          <option value="OFFER">Offer</option>
                          <option value="REJECTED">Rejected</option>
                        </select>

                        {job.url && job.url !== "#" && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:text-amber-300 p-1"
                            title="Open Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
