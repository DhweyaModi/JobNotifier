import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

console.log("\n🏥 JobNotifier Live Diagnostic & Health Check...\n");

// Read .env.local or process.env
const envPath = path.join(process.cwd(), ".env.local");
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      supabaseUrl = trimmed.split("=")[1].replace(/["']/g, "").trim();
    }
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) {
      supabaseKey = trimmed.split("=")[1].replace(/["']/g, "").trim();
    }
  });
}

console.log(`1. Supabase URL: ${supabaseUrl ? "✅ Configured (" + supabaseUrl + ")" : "⚠️ Not Found"}`);
console.log(`2. Supabase Anon Key: ${supabaseKey ? "✅ Present" : "⚠️ Not Found"}`);

if (!supabaseUrl || !supabaseKey) {
  console.log("\nℹ️ To connect to Supabase, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in web/.env.local or Vercel Environment Variables.\n");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runChecks() {
  // 1. Check jobs table
  try {
    const { data: jobs, error: jobErr } = await supabase.from("jobs").select("id, title, company, country").limit(5);
    if (jobErr) {
      console.log(`❌ Table 'jobs': Error - ${jobErr.message}`);
    } else {
      console.log(`✅ Table 'jobs': Accessible (${jobs.length} sample records retrieved)`);
    }
  } catch (e) {
    console.log(`❌ Table 'jobs': Connection error - ${e.message}`);
  }

  // 2. Check users table
  try {
    const { data: users, error: userErr } = await supabase.from("users").select("id, email, platform").limit(5);
    if (userErr) {
      console.log(`❌ Table 'users': Error - ${userErr.message}`);
    } else {
      console.log(`✅ Table 'users': Accessible (${users.length} registered users found)`);
    }
  } catch (e) {
    console.log(`❌ Table 'users': Connection error - ${e.message}`);
  }

  // 3. Check applications table
  try {
    const { data: apps, error: appErr } = await supabase.from("applications").select("user_id, job_id, status").limit(5);
    if (appErr) {
      console.log(`❌ Table 'applications': Error - ${appErr.message}`);
    } else {
      console.log(`✅ Table 'applications': Accessible (${apps.length} tracked applications found)`);
    }
  } catch (e) {
    console.log(`❌ Table 'applications': Connection error - ${e.message}`);
  }

  console.log("\n✨ Health check complete!\n");
}

runChecks();
