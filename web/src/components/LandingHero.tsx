"use client";

import React from "react";
import { Job } from "@/lib/types";
import {
  Zap,
  ArrowRight,
  ExternalLink,
  Users,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  Bookmark,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

interface LandingHeroProps {
  jobs: Job[];
  userCount: number;
  onExploreFeed: () => void;
  onOpenSlack: () => void;
  onOpenAuth: () => void;
  onToggleBookmark: (jobId: string) => void;
  bookmarks: Record<string, boolean>;
  user: any;
  guestName: string | null;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  jobs,
  userCount,
  onExploreFeed,
  onOpenSlack,
  onOpenAuth,
  onToggleBookmark,
  bookmarks,
  user,
  guestName,
}) => {
  const canadaCount = jobs.filter((j) => j.country === "canada" || j.country === "both").length;
  const usaCount = jobs.filter((j) => j.country === "usa" || j.country === "both").length;

  const previewJobs = jobs.slice(0, 6);

  return (
    <div className="relative space-y-20 py-6 md:py-12">
      {/* 1. CENTERED HERO SECTION */}
      <section className="relative overflow-hidden pt-6 pb-12">
        {/* Layer 2: Tactile Noise Overlay */}
        <div className="absolute inset-0 noise-overlay opacity-30 pointer-events-none" />

        {/* Layer 4: Precision Grid Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

        {/* Layer 3: Linear Multi-Layer Animated Ambient Light Blobs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-[#5E6AD2]/18 rounded-full blur-[150px] pointer-events-none animate-blob-float" />
        <div className="absolute top-32 -left-20 w-[600px] h-[600px] bg-[#4338CA]/14 rounded-full blur-[130px] pointer-events-none animate-blob-float-reverse" />
        <div className="absolute top-24 -right-10 w-[500px] h-[500px] bg-[#F7931A]/10 rounded-full blur-[110px] pointer-events-none animate-blob-float" />
        <div className="absolute -bottom-20 left-1/3 w-[700px] h-[350px] bg-[#5E6AD2]/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center space-y-8 px-4">
          {/* Centered Brand Icon Centerpiece */}
          <div className="relative flex items-center justify-center pt-2">
            {/* Ambient Orbital Rings */}
            <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-dashed border-[#5E6AD2]/25 animate-spin-slow absolute pointer-events-none" />
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-[#F7931A]/20 animate-spin-reverse absolute pointer-events-none" />

            <div className="relative z-10 animate-float p-5 sm:p-6 rounded-3xl bg-[#0a0a0c]/90 border border-white/[0.08] shadow-[0_0_50px_rgba(94,106,210,0.25)] backdrop-blur-xl">
              <AppLogo size="xl" showLivePulse={true} />
            </div>
          </div>

          {/* Centered Title: JobNotifier */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-[#5E6AD2]/30 shadow-lg text-xs font-mono font-semibold text-[#FFD600]">
              <span className="w-2 h-2 rounded-full bg-[#F7931A] animate-yellow-pulse" />
              <span>Live Tech & AI Internship Radar</span>
            </div>

            <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight text-white leading-none">
              <span className="bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent">Job</span>
              <span className="bg-gradient-to-r from-[#F7931A] via-[#FFD600] to-[#5E6AD2] bg-clip-text text-transparent">Notifier</span>
            </h1>
          </div>

          {/* The Explanation */}
          <p className="text-lg sm:text-xl md:text-2xl text-[#8A8F98] font-body max-w-3xl mx-auto leading-relaxed">
            A simple, real-time companion for discovering and tracking tech and AI internship opportunities across Canada and the United States. Catch early job drops, organize your applications, and stay ahead without the stress or clutter.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={onExploreFeed}
              className="btn-gold-pill px-8 py-4 text-base font-bold flex items-center gap-2.5 cursor-pointer shadow-xl"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>Explore Live Opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenSlack}
              className="px-6 py-4 rounded-full bg-white/5 hover:bg-white/10 text-[#EDEDEF] font-semibold text-base border border-white/[0.08] hover:border-[#5E6AD2]/50 transition cursor-pointer flex items-center gap-2 backdrop-blur-md"
            >
              <span>Join Slack Community</span>
              <span className="text-xs font-mono bg-[#5E6AD2]/20 text-indigo-300 px-2 py-0.5 rounded-full border border-[#5E6AD2]/40">
                Free
              </span>
            </button>

            {!user && !guestName && (
              <button
                onClick={onOpenAuth}
                className="btn-linear-primary px-6 py-4 text-base font-bold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Users className="w-4 h-4" />
                <span>Sign In / Guest Entry</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. OVERVIEW METRICS */}
      <section className="relative max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Stat Card 1: Canada Postings */}
          <div className="glass-panel rounded-2xl p-6 space-y-2 shadow-lg hover:border-[#F7931A]/40 transition">
            <div className="flex items-center justify-between text-xs font-mono text-[#8A8F98]">
              <span>CANADA OPPORTUNITIES</span>
              <span className="text-lg">🇨🇦</span>
            </div>
            <div className="font-heading text-4xl font-bold text-white tracking-tight">
              {canadaCount > 0 ? canadaCount : "120+"}
            </div>
            <p className="text-xs text-[#8A8F98] font-body">
              Verified roles across Toronto, Waterloo, Montreal, Vancouver & CA Remote.
            </p>
          </div>

          {/* Stat Card 2: USA Postings */}
          <div className="glass-panel rounded-2xl p-6 space-y-2 shadow-lg hover:border-sky-500/40 transition">
            <div className="flex items-center justify-between text-xs font-mono text-[#8A8F98]">
              <span>USA OPPORTUNITIES</span>
              <span className="text-lg">🇺🇸</span>
            </div>
            <div className="font-heading text-4xl font-bold text-white tracking-tight">
              {usaCount > 0 ? usaCount : "350+"}
            </div>
            <p className="text-xs text-[#8A8F98] font-body">
              Verified roles across SF, Seattle, NYC, Austin & US Remote.
            </p>
          </div>

          {/* Stat Card 3: Community & Subscribers */}
          <div className="glass-panel rounded-2xl p-6 space-y-2 shadow-lg hover:border-[#5E6AD2]/40 transition">
            <div className="flex items-center justify-between text-xs font-mono text-[#8A8F98]">
              <span>COMMUNITY MEMBERS</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="font-heading text-4xl font-bold text-white tracking-tight">
              {userCount > 0 ? userCount : "2,400+"}
            </div>
            <p className="text-xs text-[#8A8F98] font-body">
              Students and new grads tracking live openings and interview pipelines.
            </p>
          </div>

          {/* Stat Card 4: Effortless Tracking */}
          <div className="glass-panel rounded-2xl p-6 space-y-2 shadow-lg hover:border-[#FFD600]/40 transition">
            <div className="flex items-center justify-between text-xs font-mono text-[#8A8F98]">
              <span>APPLICATION TRACKING</span>
              <Clock className="w-4 h-4 text-[#FFD600]" />
            </div>
            <div className="font-heading text-4xl font-bold text-[#FFD600] tracking-tight">
              Instant
            </div>
            <p className="text-xs text-[#8A8F98] font-body">
              Bookmark openings and organize your progress in one click.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CORE PRINCIPLES / PHILOSOPHY */}
      <section className="relative max-w-6xl mx-auto px-4">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-white/[0.08] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#5E6AD2]/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5E6AD2]/10 border border-[#5E6AD2]/30 text-indigo-300 font-mono text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>THE JOBNOTIFIER EXPERIENCE</span>
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">
              A Low-Stress Companion For Your Search
            </h2>

            <p className="text-base sm:text-lg text-[#8A8F98] font-body leading-relaxed">
              JobNotifier surfaces fresh software, AI, data, and engineering opportunities as soon as they open. No bloated feeds, no endless spam—just a straightforward tool built to help you land your next role.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-heading font-bold text-white text-sm">Zero Spam or Clutter</h4>
                <p className="text-xs text-[#8A8F98]">No marketing emails, no filler posts, no sponsored noise.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <CheckCircle2 className="w-5 h-5 text-[#FFD600]" />
                <h4 className="font-heading font-bold text-white text-sm">Effortless Complement</h4>
                <p className="text-xs text-[#8A8F98]">Keep your existing routine; use this as your instant alert companion.</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <h4 className="font-heading font-bold text-white text-sm">100% Free Access</h4>
                <p className="text-xs text-[#8A8F98]">Built for the community to give everyone equal access to early postings.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FRESH LISTINGS PREVIEW SECTION */}
      {previewJobs.length > 0 && (
        <section className="relative max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Latest Captured Opportunities
              </h2>
              <p className="text-xs font-mono text-[#8A8F98] mt-1">
                A live preview of recent openings ready for application
              </p>
            </div>

            <button
              onClick={onExploreFeed}
              className="px-5 py-2.5 rounded-full btn-linear-primary text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <span>Explore All {jobs.length} Listings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {previewJobs.map((job) => (
              <div
                key={job.id}
                className="glass-panel job-card-halo rounded-2xl p-5 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-heading font-bold text-sm">
                        {job.company.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-sm text-white line-clamp-1">{job.company}</h4>
                        <span className="text-xs text-[#8A8F98] font-mono">
                          {job.country === "canada" ? "🇨🇦 Canada" : job.country === "usa" ? "🇺🇸 USA" : "🌍 Global"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleBookmark(job.id)}
                      className={`p-1.5 rounded-full border transition cursor-pointer ${
                        bookmarks[job.id]
                          ? "bg-[#F7931A]/20 text-[#FFD600] border-[#F7931A]/50"
                          : "bg-white/5 text-[#8A8F98] hover:text-white border-white/10"
                      }`}
                      title={bookmarks[job.id] ? "Saved" : "Save job"}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${bookmarks[job.id] ? "fill-amber-400" : ""}`} />
                    </button>
                  </div>

                  <h3 className="font-heading font-bold text-sm text-white mb-2 line-clamp-2 leading-snug">
                    {job.title}
                  </h3>

                  <div className="text-xs text-[#8A8F98] flex items-center gap-1 font-body mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="line-clamp-1">{job.location || "Remote / Unspecified"}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#FFD600]">
                    {job.scrapedAt
                      ? new Date(job.scrapedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Recent"}
                  </span>

                  {job.url && job.url !== "#" && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-linear-primary text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Apply</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-8">
            <button
              onClick={onExploreFeed}
              className="btn-gold-pill px-8 py-3.5 text-sm font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>View Full Dashboard ({jobs.length} Listings)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

