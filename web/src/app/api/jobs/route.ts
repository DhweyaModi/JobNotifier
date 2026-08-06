import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { supabase } from "@/lib/supabase";
import { Job, CountryCategory } from "@/lib/types";

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // 1. Try Supabase first if configured
    if (supabase && !forceRefresh) {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("id", { ascending: false })
        .limit(1000);

      if (!error && data && data.length > 0) {
        const jobs: Job[] = data.map((item: any) => ({
          id: item.external_uid || item.id?.toString(),
          source: item.source || "Database",
          title: item.title || "Untitled Role",
          company: item.company || "Unknown Company",
          location: item.location || "Remote",
          country: (item.country?.toLowerCase() as CountryCategory) || "other",
          url: item.url || "#",
          createdAt: item.created_at || new Date().toISOString(),
        }));
        return NextResponse.json({ jobs, source: "supabase" });
      }
    }

    const webDir = process.cwd();
    const parentDir = path.resolve(webDir, "..");
    const cachePath = path.join(webDir, "public", "jobs_cache.json");

    // 2. Instant cache load if file exists and forceRefresh is false
    if (!forceRefresh && fs.existsSync(cachePath)) {
      const cachedData = fs.readFileSync(cachePath, "utf-8");
      const jobs: Job[] = JSON.parse(cachedData);
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

      const jobs: Job[] = JSON.parse(stdout);
      return NextResponse.json({ jobs, source: "live_scrapers" });
    } catch (cmdErr) {
      console.warn("Python execution failed, attempting fallback:", cmdErr);

      if (fs.existsSync(cachePath)) {
        const cachedData = fs.readFileSync(cachePath, "utf-8");
        const jobs: Job[] = JSON.parse(cachedData);
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
