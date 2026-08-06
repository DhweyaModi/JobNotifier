"use client";

import React from "react";
import { Job, ApplicationStatus } from "@/lib/types";
import { CheckSquare, ExternalLink, Trash2, Building2, MapPin } from "lucide-react";

interface ApplicationTrackerProps {
  jobs: Job[];
  onStatusChange: (jobId: string, status: ApplicationStatus) => void;
}

const COLUMNS: { id: ApplicationStatus; title: string; color: string; badgeColor: string }[] = [
  { id: "SAVED", title: "Saved / Bookmarked", color: "border-purple-500/50", badgeColor: "bg-purple-950 text-purple-300 border-purple-800" },
  { id: "APPLIED", title: "Applied", color: "border-blue-500/50", badgeColor: "bg-blue-950 text-blue-300 border-blue-800" },
  { id: "INTERVIEWING", title: "Interviewing", color: "border-amber-500/50", badgeColor: "bg-amber-950 text-amber-300 border-amber-800" },
  { id: "OFFER", title: "Offer Extended 🎉", color: "border-emerald-500/50", badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-800" },
  { id: "REJECTED", title: "Rejected", color: "border-red-500/50", badgeColor: "bg-red-950 text-red-300 border-red-800" },
];

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  jobs,
  onStatusChange,
}) => {
  const trackedJobs = jobs.filter((j) => j.applicationStatus && j.applicationStatus !== "NONE");

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            <span>Job Application Kanban Tracker</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize your job search pipeline across application stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Total Tracked:</span>
          <span className="text-lg font-bold text-emerald-400 font-mono bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-800/40">
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
              className={`glass-panel rounded-2xl p-4 border-t-4 ${col.color} flex flex-col min-h-[500px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white line-clamp-1">{col.title}</h3>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border font-bold ${col.badgeColor}`}>
                  {colJobs.length}
                </span>
              </div>

              {/* Job List Cards in Column */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {colJobs.length === 0 ? (
                  <div className="text-center py-10 px-2 text-slate-500 text-xs italic border border-dashed border-slate-800 rounded-xl">
                    No jobs in {col.title.toLowerCase()}
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <div
                      key={job.id}
                      className="glass-card p-3.5 rounded-xl space-y-2 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {job.company}
                        </span>
                        <button
                          onClick={() => onStatusChange(job.id, "NONE")}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                          title="Untrack application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                        {job.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {job.location}
                      </p>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <select
                          value={job.applicationStatus}
                          onChange={(e) =>
                            onStatusChange(job.id, e.target.value as ApplicationStatus)
                          }
                          className="text-[11px] bg-slate-900 text-slate-300 border border-slate-800 rounded px-1.5 py-1 focus:outline-none"
                        >
                          <option value="SAVED">Saved</option>
                          <option value="APPLIED">Applied</option>
                          <option value="INTERVIEWING">Interviewing</option>
                          <option value="OFFER">Offer 🎉</option>
                          <option value="REJECTED">Rejected</option>
                        </select>

                        {job.url && job.url !== "#" && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 p-1"
                            title="Open Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
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
