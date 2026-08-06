import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { supabase } from "@/lib/supabase";
import { Job, CountryCategory } from "@/lib/types";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // 1. Try Supabase first if configured
    if (supabase) {
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

    // 2. Call python script web/scripts/fetch_jobs.py
    const webDir = process.cwd();
    const parentDir = path.resolve(webDir, "..");
    const fetchScript = path.join(webDir, "scripts", "fetch_jobs.py");
    const venvPython = path.join(parentDir, ".venv", "bin", "python");
    const pythonCmd = fs.existsSync(venvPython) ? venvPython : "python3";

    try {
      const { stdout } = await execAsync(`"${pythonCmd}" "${fetchScript}"`, {
        cwd: parentDir,
        timeout: 35000,
        maxBuffer: 15 * 1024 * 1024,
      });

      const jobs: Job[] = JSON.parse(stdout);
      return NextResponse.json({ jobs, source: "live_scrapers" });
    } catch (cmdErr) {
      console.warn("Python execution failed, falling back to seen_jobs.json:", cmdErr);

      // 3. Fallback: Parse seen_jobs.json
      const seenJobsPath = path.join(parentDir, "seen_jobs.json");
      if (fs.existsSync(seenJobsPath)) {
        const fileContent = fs.readFileSync(seenJobsPath, "utf-8");
        const rawList: string[] = JSON.parse(fileContent);

        const fallbackJobs: Job[] = rawList.map((entry, idx) => {
          const parts = entry.split(":");
          const source = parts[0] || "Scraper";
          const company = parts[1] || "Company";
          const title = parts[2] || "Role";
          const url = parts.slice(3).join(":") || "";

          let country: CountryCategory = "other";
          if (source.includes("canadian")) country = "canada";
          else if (source.includes("simplify") || source.includes("summer") || source.includes("speedy")) country = "usa";

          return {
            id: `seen-${idx}`,
            source,
            company,
            title,
            location: country === "canada" ? "Canada" : "USA / Remote",
            country,
            url,
          };
        });

        return NextResponse.json({ jobs: fallbackJobs.reverse(), source: "seen_jobs_json" });
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
