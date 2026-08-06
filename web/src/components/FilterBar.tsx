"use client";

import React from "react";
import { FilterState } from "@/lib/types";
import { Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  sources: string[];
  totalResults: number;
}

const ROLES = [
  "All Roles",
  "Software",
  "AI / ML",
  "Data Science",
  "Quant",
  "Backend",
  "Frontend",
  "Firmware",
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  sources,
  totalResults,
}) => {
  const handleCountryChange = (country: string) => {
    setFilters((prev) => ({ ...prev, country }));
  };

  const handleRoleChange = (role: string) => {
    setFilters((prev) => ({ ...prev, role: role === "All Roles" ? "" : role }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      country: "all",
      source: "all",
      role: "",
      status: "all",
      sortBy: "newest",
    });
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.country !== "all" ||
    filters.source !== "all" ||
    filters.role !== "" ||
    filters.status !== "all";

  return (
    <div className="glass-panel p-4 lg:p-5 rounded-2xl mb-6 space-y-4">
      {/* Top Controls: Search Bar & Sort Dropdown */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search by company, role title, or city (e.g. Meta, ML, Toronto)..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {filters.search && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Source Dropdown & Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:flex-none">
            <select
              value={filters.source}
              onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full md:w-auto appearance-none bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-3.5 py-2.5 pr-8 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Sources ({sources.length})</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 md:flex-none">
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as "newest" | "company" | "title",
                }))
              }
              className="w-full md:w-auto appearance-none bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-3.5 py-2.5 pr-8 focus:outline-none focus:border-indigo-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="company">Sort: Company (A-Z)</option>
              <option value="title">Sort: Title (A-Z)</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Country Filter Tabs & Quick Role Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Country Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1 hidden sm:inline">Country:</span>
          {[
            { id: "all", label: "All Countries" },
            { id: "canada", label: "Canada 🇨🇦" },
            { id: "usa", label: "USA 🇺🇸" },
            { id: "both", label: "Cross-Border 🇨🇦🇺🇸" },
            { id: "other", label: "Other 🌍" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleCountryChange(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filters.country === item.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Role Pills & Clear Button */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div className="flex items-center gap-1.5">
            {ROLES.map((r) => {
              const active =
                (r === "All Roles" && !filters.role) || filters.role === r;
              return (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? "bg-slate-700 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/50"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/40 hover:bg-red-900/50 transition ml-auto"
            >
              <X className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <span>
          Showing <strong className="text-white">{totalResults}</strong> job listing{totalResults === 1 ? "" : "s"}
        </span>
        {filters.country !== "all" && (
          <span className="text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
            Filtering: {filters.country.toUpperCase()} Channel Only
          </span>
        )}
      </div>
    </div>
  );
};
