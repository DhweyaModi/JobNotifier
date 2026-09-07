import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { supabase } from "@/lib/supabase";
import { Job, CountryCategory } from "@/lib/types";

const execAsync = promisify(exec);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[\(\[\{].*?[\)\]\}]/g, "")
    .replace(/\b(inc|llc|ltd|corp|co|technologies|technology|labs|group|platforms|solutions|interactive|software|systems)\b\.?/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeTitle(title: string): string {
  let t = title.toLowerCase().replace(/<[^>]+>/g, "").replace(/[\(\[\{].*?[\)\]\}]/g, "");
  t = t.replace(/\bswe\b/g, "software engineer")
       .replace(/\bml\b/g, "machine learning")
       .replace(/\bai\b/g, "artificial intelligence")
       .replace(/\b(engineering|developer|developers|dev)\b/g, "engineer")
       .replace(/\b(scientists|science)\b/g, "scientist")
       .replace(/\b(analysts|analytics)\b/g, "analyst")
       .replace(/\b(summer|fall|winter|spring|202[0-9]|203[0-9]|internship|intern|co-?op|coop|hybrid|remote|in-?person|in-?office|onsite|new grad|entry level|early career|usa?|canada|student|position|role|job)\b/g, " ");
  return t.replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeUrl(url: string): string {
  if (!url || url === "#") return "";
  try {
    const u = new URL(url);
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

function deduplicateJobs(jobs: Job[]): Job[] {
  const seenKeys = new Set<string>();
  const result: Job[] = [];

  for (const job of jobs) {
    const normComp = normalizeText(job.company || "");
    const normTit = normalizeTitle(job.title || "");
    const normCountry = (job.country || "").toLowerCase();
    const normU = normalizeUrl(job.url || "");

    const isNewGrad = Boolean(job.source && /new-?grad/i.test(job.source));
    const prefix = isNewGrad ? "role:newgrad:" : "role:";

    const keys: string[] = [];
    if (normU) keys.push(`url:${normU}`);
    if (normComp && normTit) {
      if (normCountry && normCountry !== "other") {
        keys.push(`${prefix}${normComp}:${normTit}:${normCountry}`);
      }
      keys.push(`${prefix}${normComp}:${normTit}`);
    }

    const isDuplicate = keys.some((k) => seenKeys.has(k)) || seenKeys.has(job.id);
    if (isDuplicate) continue;

    seenKeys.add(job.id);
    keys.forEach((k) => seenKeys.add(k));
    result.push(job);
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // 1. Try Supabase first if configured
    if (supabase && !forceRefresh) {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("first_seen_at", { ascending: false })
        .limit(3000);

      if (!error && data && data.length > 0) {
        const jobs: Job[] = data.map((item: any) => {
          const scrapedTime = item.first_seen_at || item.created_at || new Date().toISOString();
          let postedTs = 0;
          let postedStr = "";
          if (item.posted_at) {
            postedTs = Math.floor(new Date(item.posted_at).getTime() / 1000);
            try {
              postedStr = new Date(item.posted_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            } catch {
              postedStr = "";
            }
          }
          return {
            id: item.external_uid || item.id?.toString(),
            source: item.source || "Database",
            title: item.title || "Untitled Role",
            company: item.company || "Unknown Company",
            location: item.location || "Remote",
            country: (item.country?.toLowerCase() as CountryCategory) || "other",
            url: item.url || "#",
            createdAt: scrapedTime,
            scrapedAt: scrapedTime,
            firstSeenAt: scrapedTime,
            postedTimestamp: postedTs,
            postedDateStr: postedStr,
          };
        });
        const dedupedJobs = deduplicateJobs(jobs);
        return NextResponse.json({ jobs: dedupedJobs, source: "supabase" });
      }
    }

    const webDir = process.cwd();
    const parentDir = path.resolve(webDir, "..");
    const cachePath = path.join(webDir, "public", "jobs_cache.json");

    // 2. Instant cache load if file exists and forceRefresh is false
    if (!forceRefresh && fs.existsSync(cachePath)) {
      const cachedData = fs.readFileSync(cachePath, "utf-8");
      const rawJobs: Job[] = JSON.parse(cachedData);
      const jobs = deduplicateJobs(rawJobs);
      return NextResponse.json({ jobs, source: "cache" });
    }

    // 3. Fallback / Live execution of Python scrapers
    const fetchScript = path.join(webDir, "scripts", "fetch_jobs.py");
    const venvPython = path.join(parentDir, ".venv", "bin", "python");
    const pythonCmd = fs.existsSync(venvPython) ? venvPython : "python3";

    try {
      const { stdout } = await execAsync(`"${pythonCmd}" "${fetchScript}"`, {
        cwd: parentDir,
        timeout: 40000,
        maxBuffer: 20 * 1024 * 1024,
      });

      const rawJobs: Job[] = JSON.parse(stdout);
      const jobs = deduplicateJobs(rawJobs);
      return NextResponse.json({ jobs, source: "live_scrapers" });
    } catch (cmdErr) {
      console.warn("Python execution failed, attempting fallback:", cmdErr);

      if (fs.existsSync(cachePath)) {
        const cachedData = fs.readFileSync(cachePath, "utf-8");
        const rawJobs: Job[] = JSON.parse(cachedData);
        const jobs = deduplicateJobs(rawJobs);
        return NextResponse.json({ jobs, source: "cache_fallback" });
      }

      throw cmdErr;
    }
  } catch (err: any) {
    console.error("Error in /api/jobs GET:", err);
    return NextResponse.json(
      { error: "Failed to fetch jobs", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
