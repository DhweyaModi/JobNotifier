"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Job, FilterState, ApplicationStatus } from "@/lib/types";
import { Header } from "@/components/Header";
import { StatsBanner } from "@/components/StatsBanner";
import { FilterBar } from "@/components/FilterBar";
import { JobCard } from "@/components/JobCard";
import { ApplicationTracker } from "@/components/ApplicationTracker";
import { WebhookSettingsModal } from "@/components/WebhookSettingsModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Briefcase, RefreshCw, ArrowUp } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "tracker" | "settings">("feed");
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Local & cloud synced bookmarks & application statuses
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [applicationStatuses, setApplicationStatuses] = useState<Record<string, ApplicationStatus>>({});

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    countries: [],
    sources: [],
    roles: [],
    statuses: [],
    workType: "all",
    sortBy: "newest",
  });

  const [visibleCount, setVisibleCount] = useState<number>(48);

  // Load saved bookmarks, application statuses & filter preferences on mount
  useEffect(() => {
    try {
      const savedBookmarks = localStorage.getItem("jobnotifier_bookmarks");
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

      const savedStatuses = localStorage.getItem("jobnotifier_statuses");
      if (savedStatuses) setApplicationStatuses(JSON.parse(savedStatuses));

      const savedFilters = localStorage.getItem("jobnotifier_saved_filters");
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        setFilters((prev) => ({
          ...prev,
          countries: parsed.countries || [],
          roles: parsed.roles || [],
          workType: parsed.workType || "all",
          search: parsed.search || "",
        }));
      }
    } catch (e) {
      console.warn("Could not access localStorage:", e);
    }
  }, []);

  // Sync user applications & saved filter preferences from Supabase when user signs in
  useEffect(() => {
    async function loadUserData() {
      if (!supabase || !user) return;
      try {
        // 1. Load application tracker statuses
        const { data: appData } = await supabase
          .from("applications")
          .select("job_id, status")
          .eq("user_id", user.id);

        if (appData && appData.length > 0) {
          const cloudStatuses: Record<string, ApplicationStatus> = {};
          appData.forEach((row: any) => {
            if (row.job_id && row.status) {
              cloudStatuses[row.job_id] = row.status.toUpperCase() as ApplicationStatus;
            }
          });
          setApplicationStatuses((prev) => ({ ...prev, ...cloudStatuses }));
        }

        // 2. Load saved user filter preferences
        const { data: filterData } = await supabase
          .from("user_filters")
          .select("countries, roles, keywords")
          .eq("user_id", user.id)
          .maybeSingle();

        if (filterData) {
          setFilters((prev) => ({
            ...prev,
            countries: filterData.countries || prev.countries,
            roles: filterData.roles || prev.roles,
            search: (filterData.keywords && filterData.keywords[0]) || prev.search,
          }));
        }
      } catch (err) {
        console.warn("Error fetching user data from Supabase:", err);
      }
    }
    loadUserData();
  }, [user]);

  // Window scroll listener for Scroll to Top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Save bookmarks & statuses on update
  const handleToggleBookmark = (jobId: string) => {
    setBookmarks((prev) => {
      const updated = { ...prev, [jobId]: !prev[jobId] };
      localStorage.setItem("jobnotifier_bookmarks", JSON.stringify(updated));
      return updated;
    });
  };

  const handleStatusChange = async (jobId: string, status: ApplicationStatus) => {
    setApplicationStatuses((prev) => {
      const updated = { ...prev, [jobId]: status };
      localStorage.setItem("jobnotifier_statuses", JSON.stringify(updated));
      return updated;
    });

    setJobs((prevJobs) =>
      prevJobs.map((j) => (j.id === jobId ? { ...j, applicationStatus: status } : j))
    );

    // Sync to Supabase if logged in
    if (supabase && user) {
      try {
        if (status === "NONE") {
          await supabase
            .from("applications")
            .delete()
            .match({ user_id: user.id, job_id: jobId });
        } else {
          await supabase.from("applications").upsert(
            {
              user_id: user.id,
              job_id: jobId,
              status: status.toLowerCase(),
            },
            { onConflict: "user_id,job_id" }
          );
        }
      } catch (err) {
        console.warn("Could not sync application to Supabase:", err);
      }
    }
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

  // Multi-Filter & Sorting Logic
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        // 1. Multi-country filter
        if (filters.countries.length > 0) {
          if (!filters.countries.includes(job.country)) {
            return false;
          }
        }

        // 2. Multi-role filter
        if (filters.roles.length > 0) {
          const titleLower = (job.title || "").toLowerCase();
          const matchesAnyRole = filters.roles.some((r) => {
            const roleLower = r.toLowerCase();
            if (roleLower === "software") return titleLower.includes("software") || titleLower.includes("swe") || titleLower.includes("developer");
            if (roleLower === "ai / ml") return titleLower.includes("ai") || titleLower.includes("ml") || titleLower.includes("machine learning") || titleLower.includes("intelligence");
            if (roleLower === "data science") return titleLower.includes("data") || titleLower.includes("analyst") || titleLower.includes("analytics");
            if (roleLower === "quant") return titleLower.includes("quant") || titleLower.includes("trader") || titleLower.includes("trading");
            if (roleLower === "backend") return titleLower.includes("backend") || titleLower.includes("back-end") || titleLower.includes("server") || titleLower.includes("api");
            if (roleLower === "frontend") return titleLower.includes("frontend") || titleLower.includes("front-end") || titleLower.includes("web") || titleLower.includes("ui");
            if (roleLower === "firmware") return titleLower.includes("firmware") || titleLower.includes("hardware") || titleLower.includes("embedded");
            if (roleLower === "cloud / devops") return titleLower.includes("cloud") || titleLower.includes("devops") || titleLower.includes("sre") || titleLower.includes("infrastructure");
            if (roleLower === "security") return titleLower.includes("security") || titleLower.includes("cyber") || titleLower.includes("appsec");
            return titleLower.includes(roleLower);
          });
          if (!matchesAnyRole) return false;
        }

        // 3. Multi-status filter
        if (filters.statuses.length > 0) {
          const jobStatus = job.applicationStatus || "NONE";
          if (!filters.statuses.includes(jobStatus)) {
            return false;
          }
        }

        // 4. Workplace / Work type filter
        if (filters.workType !== "all") {
          const combined = `${job.title} ${job.location}`.toLowerCase();
          if (filters.workType === "remote" && !combined.includes("remote")) return false;
          if (filters.workType === "hybrid" && !combined.includes("hybrid")) return false;
          if (filters.workType === "onsite" && (combined.includes("remote") && !combined.includes("hybrid"))) return false;
        }

        // 5. Search query matching
        if (filters.search) {
          const query = filters.search.toLowerCase().trim();
          const matchTitle = (job.title || "").toLowerCase().includes(query);
          const matchCompany = (job.company || "").toLowerCase().includes(query);
          const matchLoc = (job.location || "").toLowerCase().includes(query);
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
            <StatsBanner
              jobs={jobs}
              trackedCount={trackedJobsCount}
              selectedCountries={filters.countries}
              onSelectCountry={(c) =>
                setFilters((prev) => {
                  if (c === "all") return { ...prev, countries: [] };
                  const exists = prev.countries.includes(c);
                  return {
                    ...prev,
                    countries: exists
                      ? prev.countries.filter((x) => x !== c)
                      : [...prev.countries, c],
                  };
                })
              }
            />

            {/* Filter Bar */}
            <FilterBar
              filters={filters}
              setFilters={setFilters}
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
                  Try clearing your search query or selecting a different country or role filter.
                </p>
                <button
                  onClick={() =>
                    setFilters({
                      search: "",
                      countries: [],
                      roles: [],
                      statuses: [],
                      workType: "all",
                      sortBy: "newest",
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold transition cursor-pointer"
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
                      onSelectCountry={(c) =>
                        setFilters((prev) => ({
                          ...prev,
                          countries: prev.countries.includes(c)
                            ? prev.countries
                            : [...prev.countries, c],
                        }))
                      }
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {visibleCount < filteredJobs.length && (
                  <div className="text-center py-8">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 48)}
                      className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-slate-200 text-sm font-semibold transition shadow-lg cursor-pointer"
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

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          title="Scroll to top"
          className="fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 border border-indigo-400/30 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 flex items-center justify-center group cursor-pointer"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform duration-200" />
        </button>
      )}
    </div>
  );
}
