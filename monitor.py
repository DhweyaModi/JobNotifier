import sys
from dotenv import load_dotenv
import db
from scrapers import SCRAPERS
from notifier import notify_users

# Load env variables for local testing
load_dotenv()

def main():
    # 1. Ensure admin users are seeded from environment webhooks if they exist
    print("Checking and seeding admin users...", flush=True)
    db.seed_admin_users()

    new_jobs = []

    seen_in_this_run = set()

    # 2. Iterate through all the scrapers
    for fetch_fn, label in SCRAPERS:
        try:
            print(f"[{label}] Fetching jobs...", flush=True)
            jobs = fetch_fn()
        except Exception as exc:
            print(f"[{label}] ERROR: {exc}", file=sys.stderr, flush=True)
            continue

        print(f"[{label}] fetched {len(jobs)} matching job(s) before dedup", flush=True)

        new_count = 0
        for item in jobs:
            uid, title, company, location, url = item[:5]
            raw_date = item[5] if len(item) > 5 else None
            from scrapers.base_scraper import classify_country, parse_job_date, generate_dedup_keys
            country = classify_country(location)
            ts, date_str = parse_job_date(raw_date)

            # Intra-run deduplication check
            dedup_keys = generate_dedup_keys(company, title, country, url)
            if uid in seen_in_this_run or any(k in seen_in_this_run for k in dedup_keys):
                continue

            # Try to insert/upsert job into database
            is_new = db.upsert_job(uid, label, title, company, location, country, url, ts, date_str)
            if not is_new:
                # Mark seen so subsequent scrapers in same run don't query again
                seen_in_this_run.add(uid)
                for k in dedup_keys:
                    seen_in_this_run.add(k)
                continue

            seen_in_this_run.add(uid)
            for k in dedup_keys:
                seen_in_this_run.add(k)

            new_count += 1
            new_jobs.append((label, title, company, location, url))

        print(f"[{label}] {new_count} new job(s) added.", flush=True)

    # 3. Notify users with fan-out engine
    print(f"Processing notifications for {len(new_jobs)} new job(s)...", flush=True)
    notify_users(new_jobs)

if __name__ == "__main__":
    main()