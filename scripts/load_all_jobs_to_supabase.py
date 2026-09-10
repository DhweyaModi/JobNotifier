#!/usr/bin/env python3
"""
JobNotifier Bulk Loader for Supabase
Safely scrapes all jobs (internships + new grad) and batch-upserts them directly
into Supabase and seen_jobs.json WITHOUT triggering Slack notifications.
"""
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

load_dotenv(os.path.join(root_dir, ".env"))

import db
from scrapers import SCRAPERS
from scrapers.base_scraper import classify_country, parse_job_date

def main():
    print("=" * 60)
    print(" JobNotifier: Safe Supabase Bulk Loader (No Slack Spam)")
    print("=" * 60)

    if not db.supabase:
        print("ERROR: Supabase credentials not found in environment.", file=sys.stderr)
        sys.exit(1)

    print("\n1. Fetching jobs across all active scrapers...")
    all_jobs_to_load = []

    for fetch_fn, label in SCRAPERS:
        try:
            print(f"   [{label}] Fetching...", flush=True)
            jobs = fetch_fn()
            print(f"   [{label}] Fetched {len(jobs)} items.")
            
            is_newgrad = "newgrad" in label.lower() or "new-grad" in label.lower()
            job_type = "newgrad" if is_newgrad else "internship"

            for item in jobs:
                uid, title, company, location, url = item[:5]
                raw_date = item[5] if len(item) > 5 else None
                country = classify_country(location)
                ts, date_str = parse_job_date(raw_date)

                all_jobs_to_load.append({
                    "external_uid": uid,
                    "source": label,
                    "title": title,
                    "company": company,
                    "location": location,
                    "country": country,
                    "url": url,
                    "posted_timestamp": ts,
                    "posted_date_str": date_str,
                    "job_type": job_type,
                })
        except Exception as exc:
            print(f"   [{label}] ERROR: {exc}", file=sys.stderr, flush=True)

    print(f"\n2. Total collected jobs across scrapers: {len(all_jobs_to_load)}")
    print("   Starting batch upsert to Supabase (200 items per chunk)...")

    inserted = db.batch_upsert_jobs(all_jobs_to_load)

    res = db.supabase.table("jobs").select("*", count="exact").limit(1).execute()
    total_in_db = res.count if res else "Unknown"

    print("\n" + "=" * 60)
    print(f"✅ BULK LOAD COMPLETED SUCCESSFULLY!")
    print(f"   - Newly added jobs: {inserted}")
    print(f"   - Total jobs now in Supabase: {total_in_db}")
    print(f"   - seen_jobs.json updated and synchronized.")
    print(f"   - Slack notifications sent: 0 (Zero spam guarantee)")
    print("=" * 60)

if __name__ == "__main__":
    main()
