"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Job, FilterState, ApplicationStatus } from "@/lib/types";
import { Header } from "@/components/Header";
import { StatsBanner } from "@/components/StatsBanner";
import { FilterBar } from "@/components/FilterBar";
import { JobCard } from "@/components/JobCard";
import { ApplicationTracker } from "@/components/ApplicationTracker";
import { WebhookSettingsModal } from "@/components/WebhookSettingsModal";
import { Loader2, AlertCircle, Briefcase, RefreshCw } from "lucide-react";

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "tracker" | "settings">("feed");

  // LocalStorage state for bookmarks & application statuses
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [applicationStatuses, setApplicationStatuses] = useState<Record<string, ApplicationStatus>>({});

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    country: "all",
    source: "all",
    role: "",
    status: "all",
    sortBy: "newest",
  });

  const [visibleCount, setVisibleCount] = useState<number>(48);

  // Load saved bookmarks & statuses from localStorage on mount
  useEffect(() => {
    try {
      const savedBookmarks = localStorage.getItem("jobnotifier_bookmarks");
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

      const savedStatuses = localStorage.getItem("jobnotifier_statuses");
      if (savedStatuses) setApplicationStatuses(JSON.parse(savedStatuses));
    } catch (e) {
      console.warn("Could not access localStorage:", e);
    }
  }, []);

  // Save bookmarks & statuses to localStorage on update
  const handleToggleBookmark = (jobId: string) => {
    setBookmarks((prev) => {
      const updated = { ...prev, [jobId]: !prev[jobId] };
      localStorage.setItem("jobnotifier_bookmarks", JSON.stringify(updated));
      return updated;
    });
  };

  const handleStatusChange = (jobId: string, status: ApplicationStatus) => {
    setApplicationStatuses((prev) => {
      const updated = { ...prev, [jobId]: status };
      localStorage.setItem("jobnotifier_statuses", JSON.stringify(updated));
      return updated;
    });

    setJobs((prevJobs) =>
      prevJobs.map((j) => (j.id === jobId ? { ...j, applicationStatus: status } : j))
    );
  };

  // Fetch jobs from API
  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      const rawJobs: Job[] = data.jobs || [];

      // Merge localStorage statuses into job objects
      const mergedJobs = rawJobs.map((j) => ({
        ...j,
        applicationStatus: applicationStatuses[j.id] || "NONE",
      }));

      setJobs(mergedJobs);
    } catch (err: any) {
      console.error("Failed to fetch jobs:", err);
      setError(err?.message || "Failed to load job listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Sync statuses whenever applicationStatuses changes
  useEffect(() => {
    if (jobs.length > 0) {
      setJobs((prev) =>
        prev.map((j) => ({
          ...j,
          applicationStatus: applicationStatuses[j.id] || j.applicationStatus || "NONE",
        }))
      );
    }
  }, [applicationStatuses]);

  // Unique sources list for filter dropdown
  const sourcesList = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.source) set.add(j.source);
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Filtering & Sorting Logic
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        // Country filter
        if (filters.country !== "all" && job.country !== filters.country) {
          return false;
        }

        // Source filter
        if (filters.source !== "all" && job.source !== filters.source) {
          return false;
        }

        // Role filter
        if (filters.role) {
          const roleLower = filters.role.toLowerCase();
          const titleLower = job.title.toLowerCase();
          if (roleLower === "software" && !titleLower.includes("software") && !titleLower.includes("swe")) {
            return false;
          } else if (roleLower === "ai / ml" && !titleLower.includes("ai") && !titleLower.includes("ml") && !titleLower.includes("machine learning")) {
            return false;
          } else if (roleLower === "data science" && !titleLower.includes("data") && !titleLower.includes("analyst")) {
            return false;
          } else if (roleLower === "quant" && !titleLower.includes("quant") && !titleLower.includes("trader")) {
            return false;
          } else if (roleLower === "backend" && !titleLower.includes("backend")) {
            return false;
          } else if (roleLower === "frontend" && !titleLower.includes("frontend") && !titleLower.includes("web")) {
            return false;
          } else if (roleLower === "firmware" && !titleLower.includes("firmware") && !titleLower.includes("hardware") && !titleLower.includes("embedded")) {
            return false;
          }
        }

        // Search query filter
        if (filters.search) {
          const query = filters.search.toLowerCase();
          const matchTitle = job.title.toLowerCase().includes(query);
          const matchCompany = job.company.toLowerCase().includes(query);
          const matchLoc = job.location.toLowerCase().includes(query);
          if (!matchTitle && !matchCompany && !matchLoc) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === "company") {
          return a.company.localeCompare(b.company);
        } else if (filters.sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        // Default: Newest first (highest scraped timestamp or posted date)
        const timeB = (b.scrapedAt || b.createdAt) ? new Date(b.scrapedAt || b.createdAt || "").getTime() : ((b.postedTimestamp || 0) * 1000);
        const timeA = (a.scrapedAt || a.createdAt) ? new Date(a.scrapedAt || a.createdAt || "").getTime() : ((a.postedTimestamp || 0) * 1000);
        if (!isNaN(timeB) && !isNaN(timeA) && timeB !== timeA) {
          return timeB - timeA;
        }
        return (b.postedTimestamp || 0) - (a.postedTimestamp || 0);
      });
  }, [jobs, filters]);

  const trackedJobsCount = useMemo(() => {
    return jobs.filter((j) => j.applicationStatus && j.applicationStatus !== "NONE").length;
  }, [jobs]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalJobs={jobs.length}
        trackedCount={trackedJobsCount}
        onRefresh={fetchJobs}
        isRefreshing={loading}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === "feed" && (
          <>
            {/* Stats Dashboard Banner */}
            <StatsBanner jobs={jobs} trackedCount={trackedJobsCount} />

            {/* Filter Bar */}
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              sources={sourcesList}
              totalResults={filteredJobs.length}
            />

            {/* Loading & Error States */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
                <p className="text-sm font-medium text-slate-300">Fetching live scraped jobs & filtering...</p>
                <p className="text-xs text-slate-500 mt-1">Running classification on Canada, USA, and cross-border listings</p>
              </div>
            ) : error ? (
              <div className="glass-panel p-8 rounded-2xl text-center max-w-xl mx-auto border-red-500/40">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">Failed to load jobs</h3>
                <p className="text-xs text-slate-400 mb-4">{error}</p>
                <button
                  onClick={fetchJobs}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="glass-panel p-12 rounded-2xl text-center max-w-lg mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">No matching jobs found</h3>
                <p className="text-xs text-slate-400">
                  Try clearing your search query or selecting a different country filter.
                </p>
                <button
                  onClick={() =>
                    setFilters({
                      search: "",
                      country: "all",
                      source: "all",
                      role: "",
                      status: "all",
                      sortBy: "newest",
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold transition"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                {/* Job Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredJobs.slice(0, visibleCount).map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onStatusChange={handleStatusChange}
                      isBookmarked={!!bookmarks[job.id]}
                      onToggleBookmark={handleToggleBookmark}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {visibleCount < filteredJobs.length && (
                  <div className="text-center py-8">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 48)}
                      className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-slate-200 text-sm font-semibold transition shadow-lg"
                    >
                      Load More Listings ({filteredJobs.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "tracker" && (
          <ApplicationTracker jobs={jobs} onStatusChange={handleStatusChange} />
        )}

        {activeTab === "settings" && <WebhookSettingsModal />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>JobNotifier Dashboard • Active Scrapers & Strict Country Filtering Enabled</p>
      </footer>
    </div>
  );
}
