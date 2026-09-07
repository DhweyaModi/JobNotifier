import sys
import argparse
from dotenv import load_dotenv
import db
from scrapers import SCRAPERS, NEWGRAD_SCRAPERS, INTERNSHIP_SCRAPERS
from notifier import notify_users

# Load env variables for local testing
load_dotenv()

def run_monitor(scrapers_list=None, mode_label="All", notify=True):
    """
    Executes the scraper and notification pipeline for the provided scrapers list.
    """
    # 0. Pre-flight health check to prevent silent database failures
    if db.supabase:
        print(f"[{mode_label} Monitor] Running pre-flight database health check...", flush=True)
        is_healthy, msg = db.verify_database_health()
        if not is_healthy:
            err_banner = (
                f"\n{'='*70}\n"
                f"🚨 CRITICAL DATABASE ERROR: {msg}\n"
                f"Aborting monitor run to prevent silent data loss and desync!\n"
                f"{'='*70}\n"
            )
            print(err_banner, file=sys.stderr, flush=True)
            raise RuntimeError(f"Database write access failed: {msg}")
        print(f"[{mode_label} Monitor] ✅ {msg}", flush=True)

    # 1. Ensure admin users are seeded from environment webhooks if they exist
    print(f"[{mode_label} Monitor] Checking and seeding admin users...", flush=True)
    db.seed_admin_users()

    if scrapers_list is None:
        scrapers_list = SCRAPERS

    new_jobs = []
    seen_in_this_run = set()

    # 2. Iterate through all the scrapers in the target list
    for fetch_fn, label in scrapers_list:
        try:
            print(f"[{label}] Fetching jobs...", flush=True)
            jobs = fetch_fn()
        except Exception as exc:
            print(f"[{label}] ERROR: {exc}", file=sys.stderr, flush=True)
            continue

        print(f"[{label}] fetched {len(jobs)} matching job(s) before dedup", flush=True)

        is_newgrad = "newgrad" in label.lower() or "new-grad" in label.lower()
        job_type = "newgrad" if is_newgrad else "internship"

        new_count = 0
        for item in jobs:
            uid, title, company, location, url = item[:5]
            raw_date = item[5] if len(item) > 5 else None
            from scrapers.base_scraper import classify_country, parse_job_date, generate_dedup_keys
            country = classify_country(location)
            ts, date_str = parse_job_date(raw_date)

            # Intra-run deduplication check
            dedup_keys = generate_dedup_keys(company, title, country, url, job_type=job_type)
            if uid in seen_in_this_run or any(k in seen_in_this_run for k in dedup_keys):
                continue

            # Try to insert/upsert job into database
            is_new = db.upsert_job(uid, label, title, company, location, country, url, ts, date_str, job_type=job_type)
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
    if notify:
        print(f"Processing notifications for {len(new_jobs)} new job(s)...", flush=True)
        notify_users(new_jobs)
    else:
        print(f"Notifications disabled (--no-notify). {len(new_jobs)} new job(s) saved without sending alerts.", flush=True)


def main():
    parser = argparse.ArgumentParser(description="JobNotifier Multi-Source Scraper Monitor")
    parser.add_argument(
        "--type",
        choices=["all", "internship", "newgrad"],
        default="all",
        help="Type of jobs to monitor (all, internship, newgrad)"
    )
    parser.add_argument(
        "--no-notify",
        action="store_true",
        help="Scrape and save jobs to database/seen without sending notifications"
    )
    args = parser.parse_args()

    notify = not args.no_notify

    if args.type == "newgrad":
        run_monitor(NEWGRAD_SCRAPERS, mode_label="New Grad", notify=notify)
    elif args.type == "internship":
        run_monitor(INTERNSHIP_SCRAPERS, mode_label="Internship", notify=notify)
    else:
        run_monitor(SCRAPERS, mode_label="All", notify=notify)


if __name__ == "__main__":
    main()