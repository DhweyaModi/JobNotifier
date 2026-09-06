"use client";

import React, { useState, useEffect } from "react";
import { FilterState, ApplicationStatus } from "@/lib/types";
import {
  Search,
  RotateCcw,
  SlidersHorizontal,
  X,
  Bookmark,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalResults: number;
}

const AVAILABLE_ROLES = [
  "Software",
  "AI / ML",
  "Data Science",
  "Quant",
  "Backend",
  "Frontend",
  "Firmware",
  "Cloud / DevOps",
  "Security",
];

const AVAILABLE_COUNTRIES = [
  { id: "canada", label: "Canada", dotColor: "bg-[#FBBF24]" },
  { id: "usa", label: "USA", dotColor: "bg-[#3B82F6]" },
  { id: "both", label: "Cross-Border", dotColor: "bg-[#3B82F6]" },
  { id: "other", label: "Other", dotColor: "bg-[#5A5A6E]" },
];

const AVAILABLE_STATUSES: { id: ApplicationStatus; label: string }[] = [
  { id: "SAVED", label: "Saved" },
  { id: "APPLIED", label: "Applied" },
  { id: "INTERVIEWING", label: "Interviewing" },
  { id: "OFFER", label: "Offer" },
  { id: "REJECTED", label: "Rejected" },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  totalResults,
}) => {
  const { user } = useAuth();
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Sync filter changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "jobnotifier_saved_filters",
        JSON.stringify({
          countries: filters.countries,
          roles: filters.roles,
          workType: filters.workType,
          search: filters.search,
        })
      );
    } catch (e) {}
  }, [filters]);

  const handleSavePreferences = async () => {
    const client = supabase;
    if (client && user) {
      try {
        await client.from("user_filters").upsert(
          {
            user_id: user.id,
            countries: filters.countries,
            roles: filters.roles,
            keywords: filters.search ? [filters.search] : [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      } catch (err) {
        console.warn("Could not save preferences:", err);
      }
    } else {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const toggleCountry = (country: string) => {
    setFilters((prev) => {
      const exists = prev.countries.includes(country);
      return {
        ...prev,
        countries: exists
          ? prev.countries.filter((c) => c !== country)
          : [...prev.countries, country],
      };
    });
  };

  const toggleRole = (role: string) => {
    setFilters((prev) => {
      const exists = prev.roles.includes(role);
      return {
        ...prev,
        roles: exists
          ? prev.roles.filter((r) => r !== role)
          : [...prev.roles, role],
      };
    });
  };

  const toggleStatus = (status: ApplicationStatus) => {
    setFilters((prev) => {
      const exists = prev.statuses.includes(status);
      return {
        ...prev,
        statuses: exists
          ? prev.statuses.filter((s) => s !== status)
          : [...prev.statuses, status],
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      countries: [],
      roles: [],
      statuses: [],
      workType: "all",
      sortBy: "newest",
    });
  };

  const activeCount =
    filters.countries.length +
    filters.roles.length +
    filters.statuses.length +
    (filters.workType !== "all" ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4 mb-6 shadow-xl">
      {/* 1. Search Bar & Dropdowns */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input with Indigo Focus Glow */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search companies, titles, or locations (e.g. Google, SWE, Toronto)..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="w-full bg-slate-900/80 border border-white/10 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/25 text-white placeholder:text-slate-500 pl-11 pr-10 py-2.5 rounded-full text-sm outline-none transition"
          />
          {filters.search && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Save Preferences Button */}
          <button
            onClick={handleSavePreferences}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#4F46E5]/40 text-indigo-300 hover:bg-[#4F46E5] hover:text-white font-mono text-xs font-bold bg-transparent transition shadow-[0_0_15px_rgba(79,70,229,0.15)] cursor-pointer"
            title="Save your current filter setup"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{savedSuccess ? "Saved!" : "Save Preferences"}</span>
          </button>

          {/* Sort Dropdown */}
          <select
            value={filters.sortBy}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                sortBy: e.target.value as "newest" | "company" | "title",
              }))
            }
            className="bg-slate-900/80 border border-white/10 hover:border-[#4F46E5]/40 text-slate-200 px-4 py-2.5 rounded-full font-mono text-xs font-semibold cursor-pointer outline-none transition"
          >
            <option value="newest" className="bg-[#0B1120] text-white">Sort: Newest First</option>
            <option value="company" className="bg-[#0B1120] text-white">Sort: Company (A-Z)</option>
            <option value="title" className="bg-[#0B1120] text-white">Sort: Job Title</option>
          </select>

          {/* Pipeline Dropdown */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-mono font-bold border transition cursor-pointer ${
              showAdvanced
                ? "bg-[#4F46E5] text-white border-transparent shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                : "bg-slate-900/80 border-white/10 hover:border-[#4F46E5]/40 text-slate-300"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Pipeline</span>
            {filters.statuses.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Country Filter Pills & Workplace Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.08]">
        {/* All Regions Pill */}
        <button
          onClick={() => setFilters((prev) => ({ ...prev, countries: [] }))}
          className={`px-4 py-1.5 rounded-full text-xs font-mono transition cursor-pointer ${
            filters.countries.length === 0
              ? "bg-[#5E6AD2] text-white font-bold border-2 border-[#5E6AD2] ring-2 ring-[#5E6AD2]/50 shadow-[0_0_18px_rgba(94,106,210,0.5)]"
              : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-[#5E6AD2]/40"
          }`}
        >
          All Regions
        </button>

        {/* Country Pills with colored info dots */}
        {AVAILABLE_COUNTRIES.map((c) => {
          const isSelected = filters.countries.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCountry(c.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono transition cursor-pointer ${
                isSelected
                  ? "bg-[#5E6AD2] text-white font-bold border-2 border-[#5E6AD2] ring-2 ring-[#5E6AD2]/50 shadow-[0_0_18px_rgba(94,106,210,0.5)]"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-[#5E6AD2]/40"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${c.dotColor} shrink-0`}></span>
              <span>{c.label}</span>
            </button>
          );
        })}

        {/* Workplace Type Segmented Switch */}
        <div className="ml-auto flex items-center gap-1 bg-slate-900/80 p-1 rounded-full border border-white/10">
          {[
            { id: "all", label: "All" },
            { id: "remote", label: "Remote" },
            { id: "hybrid", label: "Hybrid" },
            { id: "onsite", label: "Onsite" },
          ].map((type) => {
            const isSelected = filters.workType === type.id;
            return (
              <button
                key={type.id}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    workType: type.id as "all" | "remote" | "hybrid" | "onsite",
                  }))
                }
                className={`px-3 py-1 rounded-full text-xs font-mono transition cursor-pointer ${
                  isSelected
                    ? "bg-[#5E6AD2] text-white font-bold ring-2 ring-[#5E6AD2]/60 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Role Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mr-1.5">
          Roles:
        </span>

        {/* All Roles */}
        <button
          onClick={() => setFilters((prev) => ({ ...prev, roles: [] }))}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition cursor-pointer ${
            filters.roles.length === 0
              ? "bg-[#5E6AD2] text-white font-bold border-2 border-[#5E6AD2] ring-2 ring-[#5E6AD2]/50 shadow-[0_0_15px_rgba(94,106,210,0.5)]"
              : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-[#5E6AD2]/40"
          }`}
        >
          All Roles
        </button>

        {/* Role Pills */}
        {AVAILABLE_ROLES.map((role) => {
          const isSelected = filters.roles.includes(role);
          return (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition cursor-pointer ${
                isSelected
                  ? "bg-[#5E6AD2] text-white font-bold border-2 border-[#5E6AD2] ring-2 ring-[#5E6AD2]/50 shadow-[0_0_15px_rgba(94,106,210,0.5)]"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-[#5E6AD2]/40"
              }`}
            >
              <span>{role}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Collapsible Pipeline Stages */}
      {showAdvanced && (
        <div className="pt-3 border-t border-white/10 space-y-2 animate-in fade-in duration-150">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Pipeline Stage Filter:
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, statuses: [] }))}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition cursor-pointer ${
                filters.statuses.length === 0
                  ? "bg-[#5E6AD2] text-white font-bold border-2 border-[#5E6AD2] ring-2 ring-[#5E6AD2]/50 shadow-sm"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              All Stages
            </button>
            {AVAILABLE_STATUSES.map((st) => {
              const isSelected = filters.statuses.includes(st.id);
              return (
                <button
                  key={st.id}
                  onClick={() => toggleStatus(st.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition cursor-pointer ${
                    isSelected
                      ? "bg-[#5E6AD2] text-white font-bold border-2 border-[#5E6AD2] ring-2 ring-[#5E6AD2]/50 shadow-sm"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Active Filters & Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-sm font-body">
            Showing <strong className="text-white font-mono text-base font-bold">{totalResults}</strong> listings
          </span>

          {/* Active Tags */}
          {filters.countries.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-xs"
            >
              <span>{c.toUpperCase()}</span>
              <button
                onClick={() => toggleCountry(c)}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}

          {filters.roles.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-xs"
            >
              <span>{r}</span>
              <button
                onClick={() => toggleRole(r)}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}

          {filters.workType !== "all" && (
            <span
              key={filters.workType}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-xs"
            >
              <span>{filters.workType.toUpperCase()}</span>
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, workType: "all" }))
                }
                className="hover:text-white cursor-pointer ml-0.5"
              >
                ✕
              </button>
            </span>
          )}

          {filters.statuses.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-xs"
            >
              <span>{st}</span>
              <button
                onClick={() => toggleStatus(st as ApplicationStatus)}
                className="hover:text-white cursor-pointer ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}
        </div>

        {activeCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset filters ({activeCount})</span>
          </button>
        )}
      </div>
    </div>
  );
};
