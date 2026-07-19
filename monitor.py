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
        for uid, title, company, location, url in jobs:
            # We determine the country category to store it in the database
            from scrapers.base_scraper import classify_country
            country = classify_country(location)

            # Try to insert/upsert job
            is_new = db.upsert_job(uid, label, title, company, location, country, url)
            if not is_new:
                continue

            new_count += 1
            new_jobs.append((label, title, company, location, url))

        print(f"[{label}] {new_count} new job(s) added.", flush=True)

    # 3. Notify users with fan-out engine
    print(f"Processing notifications for {len(new_jobs)} new job(s)...", flush=True)
    notify_users(new_jobs)

if __name__ == "__main__":
    main()