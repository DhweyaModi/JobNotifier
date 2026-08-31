"use client";

import React, { useState, useEffect } from "react";
import { FilterState } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Check,
  ChevronDown,
  RotateCcw,
  Sparkles,
  MapPin,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Save,
  Loader2,
} from "lucide-react";

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
  { id: "canada", label: "Canada", flag: "🇨🇦" },
  { id: "usa", label: "USA", flag: "🇺🇸" },
  { id: "both", label: "Cross-Border", flag: "🇨🇦🇺🇸" },
  { id: "other", label: "International", flag: "🌍" },
];

const AVAILABLE_STATUSES = [
  { id: "SAVED", label: "Saved ⭐" },
  { id: "APPLIED", label: "Applied 📝" },
  { id: "INTERVIEWING", label: "Interviewing 🎯" },
  { id: "OFFER", label: "Offer 🎉" },
  { id: "NONE", label: "Fresh / Unapplied 🆕" },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  totalResults,
}) => {
  const { user } = useAuth();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedFilters, setHasSavedFilters] = useState(false);

  // Check if saved preferences exist in localStorage or Supabase
  useEffect(() => {
    const local = localStorage.getItem("jobnotifier_saved_filters");
    if (local) setHasSavedFilters(true);
  }, []);

  // Save current filter preferences
  const handleSaveFilters = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const preferences = {
        countries: filters.countries,
        roles: filters.roles,
        workType: filters.workType,
        search: filters.search,
      };

      // 1. Save to LocalStorage
      localStorage.setItem("jobnotifier_saved_filters", JSON.stringify(preferences));
      setHasSavedFilters(true);

      // 2. Sync to Supabase user_filters table if logged in
      if (supabase && user) {
        await supabase.from("user_filters").upsert(
          {
            user_id: user.id,
            countries: filters.countries,
            roles: filters.roles,
            keywords: filters.search ? [filters.search] : [],
          },
          { onConflict: "user_id" }
        );
      }

      setSaveStatus("Preferences saved! They will load automatically when you open the app.");
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      setSaveStatus(`Could not save: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Load saved filter preferences
  const handleLoadSavedFilters = () => {
    try {
      const local = localStorage.getItem("jobnotifier_saved_filters");
      if (local) {
        const parsed = JSON.parse(local);
        setFilters((prev) => ({
          ...prev,
          countries: parsed.countries || [],
          roles: parsed.roles || [],
          workType: parsed.workType || "all",
          search: parsed.search || "",
        }));
        setSaveStatus("Loaded your saved filter preferences!");
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (e) {
      console.warn("Could not parse saved filters:", e);
    }
  };

  // Toggle Country Multi-select
  const toggleCountry = (countryId: string) => {
    setFilters((prev) => {
      const exists = prev.countries.includes(countryId);
      const updated = exists
        ? prev.countries.filter((c) => c !== countryId)
        : [...prev.countries, countryId];
      return { ...prev, countries: updated };
    });
  };

  // Toggle Role Multi-select
  const toggleRole = (role: string) => {
    setFilters((prev) => {
      const exists = prev.roles.includes(role);
      const updated = exists
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles: updated };
    });
  };

  // Toggle Status Multi-select
  const toggleStatus = (statusId: string) => {
    setFilters((prev) => {
      const exists = prev.statuses.includes(statusId);
      const updated = exists
        ? prev.statuses.filter((s) => s !== statusId)
        : [...prev.statuses, statusId];
      return { ...prev, statuses: updated };
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

  // Calculate total active filter constraints
  const activeCount =
    (filters.search ? 1 : 0) +
    filters.countries.length +
    filters.roles.length +
    filters.statuses.length +
    (filters.workType !== "all" ? 1 : 0);

  return (
    <div className="glass-panel p-4 lg:p-5 rounded-2xl mb-6 space-y-4 border border-slate-800 shadow-xl">
      {/* 1. Top Bar: Search Input & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            placeholder="Search by company, role title, city, or tech stack (e.g. Google, PyTorch, Toronto)..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {filters.search && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Controls: Sort, Save Preferences & Advanced Toggle */}
        <div className="flex items-center gap-2">
          {/* Save Preferences Button */}
          <button
            onClick={handleSaveFilters}
            disabled={isSaving}
            title="Save current filters as your default preferences"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border border-slate-800 hover:border-indigo-500/40 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="hidden sm:inline">Save Preferences</span>
          </button>

          {/* Load Saved Preferences Button */}
          {hasSavedFilters && (
            <button
              onClick={handleLoadSavedFilters}
              title="Load your saved filter preferences"
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Load Saved</span>
            </button>
          )}

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as "newest" | "company" | "title",
                }))
              }
              className="appearance-none bg-slate-900/90 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 pr-7 focus:outline-none focus:border-indigo-500 cursor-pointer hover:bg-slate-800 transition"
            >
              <option value="newest">Newest First</option>
              <option value="company">Company (A-Z)</option>
              <option value="title">Title (A-Z)</option>
            </select>
            <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Advanced Pipeline Filter Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              showAdvanced || filters.statuses.length > 0
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                : "bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pipeline</span>
            {filters.statuses.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white font-mono text-[10px] font-bold">
                {filters.statuses.length}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showAdvanced ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save Status Banner Notification */}
      {saveStatus && (
        <div className="p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-800/80 text-indigo-200 text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{saveStatus}</span>
          </span>
          <button onClick={() => setSaveStatus(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 2. Country Multi-Select Tabs & Workplace Type */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
        <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mr-1">
          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
          <span>Country:</span>
        </span>

        {/* All Countries Button */}
        <button
          onClick={() => setFilters((prev) => ({ ...prev, countries: [] }))}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            filters.countries.length === 0
              ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800/80"
          }`}
        >
          All Countries
        </button>

        {/* Multi-Select Country Badges */}
        {AVAILABLE_COUNTRIES.map((c) => {
          const isSelected = filters.countries.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCountry(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                isSelected
                  ? "bg-indigo-600/30 text-indigo-200 border-indigo-500 shadow-md shadow-indigo-600/20"
                  : "bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800/60"
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.label}</span>
              {isSelected && <Check className="w-3 h-3 text-indigo-300 ml-0.5" />}
            </button>
          );
        })}

        {/* Workplace Type Segmented Switch */}
        <div className="ml-auto flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {[
            { id: "all", label: "All" },
            { id: "remote", label: "Remote 🏠" },
            { id: "hybrid", label: "Hybrid 🔄" },
            { id: "onsite", label: "Onsite 🏢" },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  workType: type.id as "all" | "remote" | "hybrid" | "onsite",
                }))
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                filters.workType === type.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Role Multi-Select Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mr-1">
          <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
          <span>Roles:</span>
        </span>

        {/* All Roles Button */}
        <button
          onClick={() => setFilters((prev) => ({ ...prev, roles: [] }))}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
            filters.roles.length === 0
              ? "bg-slate-700 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60"
          }`}
        >
          All Roles
        </button>

        {/* Multi-Select Role Chips */}
        {AVAILABLE_ROLES.map((role) => {
          const isSelected = filters.roles.includes(role);
          return (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                isSelected
                  ? "bg-cyan-950 text-cyan-200 border-cyan-500 shadow-sm shadow-cyan-900/40"
                  : "bg-slate-900/70 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-800"
              }`}
            >
              <span>{role}</span>
              {isSelected && <Check className="w-3 h-3 text-cyan-300 ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* 4. Collapsible Pipeline Status Multi-Filter */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-800/80 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Application Pipeline Stage (Multi-Select)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, statuses: [] }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                filters.statuses.length === 0
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              All Statuses
            </button>
            {AVAILABLE_STATUSES.map((st) => {
              const isSelected = filters.statuses.includes(st.id);
              return (
                <button
                  key={st.id}
                  onClick={() => toggleStatus(st.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                    isSelected
                      ? "bg-emerald-950 text-emerald-200 border-emerald-500"
                      : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                  }`}
                >
                  <span>{st.label}</span>
                  {isSelected && <Check className="w-3 h-3 text-emerald-300" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Active Filters Pill Badges & Reset Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400">
            Showing <strong className="text-white font-mono">{totalResults}</strong> matching job
            {totalResults === 1 ? "" : "s"}
          </span>

          {/* Active Tags */}
          {filters.countries.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-[11px]"
            >
              <span>{c.toUpperCase()}</span>
              <button
                onClick={() => toggleCountry(c)}
                className="hover:text-white ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}

          {filters.roles.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 text-[11px]"
            >
              <span>{r}</span>
              <button
                onClick={() => toggleRole(r)}
                className="hover:text-white ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}

          {filters.workType !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 text-[11px]">
              <span>{filters.workType.toUpperCase()}</span>
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, workType: "all" }))
                }
                className="hover:text-white ml-0.5"
              >
                ✕
              </button>
            </span>
          )}

          {filters.statuses.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[11px]"
            >
              <span>{st}</span>
              <button
                onClick={() => toggleStatus(st)}
                className="hover:text-white ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}
        </div>

        {activeCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/40 hover:bg-red-900/50 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All ({activeCount})</span>
          </button>
        )}
      </div>
    </div>
  );
};
