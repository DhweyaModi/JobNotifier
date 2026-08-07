import os
import sys
import json
import re
from datetime import datetime, timezone

web_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
parent_dir = os.path.abspath(os.path.join(web_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from scrapers import SCRAPERS
from scrapers.base_scraper import classify_country, parse_job_date

def main():
    all_jobs = []
    
    # 1. Fetch live jobs from scrapers
    for fetch_fn, label in SCRAPERS:
        try:
            jobs = fetch_fn()
            for item in jobs:
                # Scrapers return (uid, title, company, loc, url) or extra fields
                uid = item[0]
                title = item[1]
                company = item[2]
                loc = item[3]
                url = item[4]
                raw_date = item[5] if len(item) > 5 else None

                # Extract date from item or URL/UID if present
                ts, date_display = parse_job_date(raw_date)

                c = classify_country(loc)
                all_jobs.append({
                    "id": uid,
                    "source": label,
                    "title": title,
                    "company": company,
                    "location": loc,
                    "country": c,
                    "url": url,
                    "postedTimestamp": ts,
                    "postedDateStr": date_display,
                })
        except Exception as e:
            sys.stderr.write(f"Scraper error [{label}]: {e}\n")

    # 2. Sort all jobs descending by postedTimestamp (newest first)
    all_jobs.sort(key=lambda j: j.get("postedTimestamp", 0), reverse=True)

    # 3. Save to public/jobs_cache.json
    cache_path = os.path.join(web_dir, "public", "jobs_cache.json")
    try:
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        with open(cache_path, "w") as f:
            json.dump(all_jobs, f)
        sys.stderr.write(f"Updated {cache_path} with {len(all_jobs)} jobs sorted by date.\n")
    except Exception as e:
        sys.stderr.write(f"Failed to write cache: {e}\n")

    print(json.dumps(all_jobs))

if __name__ == "__main__":
    main()
