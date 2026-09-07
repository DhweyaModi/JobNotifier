"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Job, FilterState, ApplicationStatus } from "@/lib/types";
import { Header } from "@/components/Header";
import { LandingHero } from "@/components/LandingHero";
import { StatsBanner } from "@/components/StatsBanner";
import { FilterBar } from "@/components/FilterBar";
import { JobCard } from "@/components/JobCard";
import { ApplicationTracker } from "@/components/ApplicationTracker";
import { SlackInviteToast } from "@/components/SlackInviteToast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { AlertCircle, Briefcase, RefreshCw, ArrowUp } from "lucide-react";

export default function Home() {
  const { user, guestName } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "feed" | "tracker">("home");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [slackModalOpen, setSlackModalOpen] = useState(false);
  const [userCount, setUserCount] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Local & cloud synced bookmarks & application statuses
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [applicationStatuses, setApplicationStatuses] = useState<Record<string, ApplicationStatus>>({});

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    countries: [],
    roles: [],
    statuses: [],
    workType: "all",
    jobType: "all",
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
          jobType: parsed.jobType || "all",
          search: parsed.search || "",
        }));
      }
    } catch (e) {
      console.warn("Could not access localStorage:", e);
    }
  }, []);

  // Fetch live community members count from Supabase
  useEffect(() => {
    async function fetchCommunityCount() {
      if (!supabase) return;
      try {
        const { count, error } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });
        if (!error && typeof count === "number" && count > 0) {
          setUserCount(count);
        }
      } catch (e) {
        console.warn("Could not fetch user count:", e);
      }
    }
    fetchCommunityCount();
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
          const cloudBookmarks: Record<string, boolean> = {};
          appData.forEach((row: any) => {
            if (row.job_id && row.status) {
              const upper = row.status.toUpperCase() as ApplicationStatus;
              cloudStatuses[row.job_id] = upper;
              if (upper === "SAVED") {
                cloudBookmarks[row.job_id] = true;
              }
            }
          });
          setApplicationStatuses((prev) => ({ ...prev, ...cloudStatuses }));
          setBookmarks((prev) => ({ ...prev, ...cloudBookmarks }));
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
    const isNowBookmarked = !bookmarks[jobId];

    setBookmarks((prev) => {
      const updated = { ...prev, [jobId]: isNowBookmarked };
      localStorage.setItem("jobnotifier_bookmarks", JSON.stringify(updated));
      return updated;
    });

    if (isNowBookmarked) {
      handleStatusChange(jobId, "SAVED");
    } else {
      const currentStatus = applicationStatuses[jobId] || "NONE";
      if (currentStatus === "SAVED") {
        handleStatusChange(jobId, "NONE");
      }
    }
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

    // Synchronize bookmark state
    if (status === "SAVED") {
      setBookmarks((prev) => {
        const updated = { ...prev, [jobId]: true };
        localStorage.setItem("jobnotifier_bookmarks", JSON.stringify(updated));
        return updated;
      });
    } else if (status === "NONE") {
      setBookmarks((prev) => {
        const updated = { ...prev, [jobId]: false };
        localStorage.setItem("jobnotifier_bookmarks", JSON.stringify(updated));
        return updated;
      });
    }

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

      // Merge localStorage statuses and bookmarks into job objects
      const mergedJobs = rawJobs.map((j) => ({
        ...j,
        applicationStatus: applicationStatuses[j.id] || (bookmarks[j.id] ? "SAVED" : "NONE"),
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

  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        // 0. Job Type filter (All vs Internships vs New Grad)
        if (filters.jobType && filters.jobType !== "all") {
          const isNewGrad = Boolean(job.source && /new-?grad/i.test(job.source));
          if (filters.jobType === "newgrad" && !isNewGrad) return false;
          if (filters.jobType === "internship" && isNewGrad) return false;
        }

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
        // Default: Newest first (highest posted timestamp, then fallback to scraped date)
        const getJobTime = (j: Job) => {
          if (j.postedTimestamp && j.postedTimestamp > 0) return j.postedTimestamp * 1000;
          if (j.firstSeenAt) {
            const t = new Date(j.firstSeenAt).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          if (j.scrapedAt || j.createdAt) {
            const t = new Date(j.scrapedAt || j.createdAt || "").getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          return 0;
        };
        const timeB = getJobTime(b);
        const timeA = getJobTime(a);
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return (b.id || "").localeCompare(a.id || "");
      });
  }, [jobs, filters]);

  const trackedJobsCount = useMemo(() => {
    return jobs.filter((j) => j.applicationStatus && j.applicationStatus !== "NONE").length;
  }, [jobs]);

  return (
    <div className="min-h-screen text-[#EDEDEF] flex flex-col font-sans selection:bg-[#5E6AD2]/35 selection:text-white">
      {/* Navbar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalJobs={jobs.length}
        trackedCount={trackedJobsCount}
        onRefresh={fetchJobs}
        isRefreshing={loading}
        authModalOpen={authModalOpen}
        setAuthModalOpen={setAuthModalOpen}
        slackModalOpen={slackModalOpen}
        setSlackModalOpen={setSlackModalOpen}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pt-4 pb-12">
        {activeTab === "home" && (
          <LandingHero
            jobs={jobs}
            userCount={userCount}
            onExploreFeed={() => {
              setActiveTab("feed");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onOpenSlack={() => setSlackModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
            onToggleBookmark={handleToggleBookmark}
            bookmarks={bookmarks}
            user={user}
            guestName={guestName}
          />
        )}

        {activeTab === "feed" && (
          <>
            {/* Stats Dashboard Banner (28px gap to search bar) */}
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

            {/* Filter Bar (20px gap to job grid) */}
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              totalResults={filteredJobs.length}
            />

            {/* Loading Skeleton Cards (Glass Shimmer) */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="glass-panel rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-4 rounded-lg skeleton-shimmer" />
                          <div className="w-20 h-3 rounded-lg skeleton-shimmer" />
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full skeleton-shimmer" />
                    </div>
                    <div className="w-4/5 h-5 rounded-lg skeleton-shimmer" />
                    <div className="flex justify-between items-center pt-2">
                      <div className="w-32 h-3.5 rounded-lg skeleton-shimmer" />
                      <div className="w-16 h-3.5 rounded-lg skeleton-shimmer" />
                    </div>
                    <div className="pt-3.5 border-t border-white/10 flex justify-between">
                      <div className="w-24 h-8 rounded-full skeleton-shimmer" />
                      <div className="w-20 h-8 rounded-full skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="glass-panel p-8 rounded-3xl text-center max-w-lg mx-auto border border-red-500/30">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2.5" />
                <h3 className="text-base font-display font-bold text-slate-100 mb-1">Failed to load listings</h3>
                <p className="text-sm text-slate-400 mb-4">{error}</p>
                <button
                  onClick={fetchJobs}
                  className="px-5 py-2.5 rounded-full btn-purple-pill text-xs font-bold shadow-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl text-center max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-base font-display font-bold text-slate-100">No matching opportunities found</h3>
                <p className="text-sm text-slate-400">
                  Try adjusting your search query or selecting different region or role filters.
                </p>
                <button
                  onClick={() =>
                    setFilters({
                      search: "",
                      countries: [],
                      roles: [],
                      statuses: [],
                      workType: "all",
                      jobType: "all",
                      sortBy: "newest",
                    })
                  }
                  className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-semibold border border-white/15 transition cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                {/* Job Cards Grid: 3 columns desktop, 2 tablet, 1 mobile, gap 16px (gap-4) */}
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
                      className="px-7 py-3 rounded-full glass-panel glass-panel-hover font-display font-bold text-slate-200 hover:text-white text-sm transition cursor-pointer"
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
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 font-mono">
        <p>JobNotifier • Live Tech & AI Internship Tracker</p>
      </footer>

      {/* Soft Slide-in Slack Community Toast (Appears 5s after sign-in) */}
      <SlackInviteToast />

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          title="Scroll to top"
          className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-[#0B1120]/90 hover:bg-[#0B1120] text-slate-300 hover:text-amber-400 border border-white/15 hover:border-amber-500/50 shadow-2xl backdrop-blur-xl transition-all cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
