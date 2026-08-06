import os
import sys
import json

# Ensure parent directory (JobNotifier) is in sys.path
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from scrapers import SCRAPERS
from scrapers.base_scraper import classify_country

def main():
    all_jobs = []
    for fetch_fn, label in SCRAPERS:
        try:
            jobs = fetch_fn()
            for uid, title, company, loc, url in jobs:
                c = classify_country(loc)
                all_jobs.append({
                    "id": uid,
                    "source": label,
                    "title": title,
                    "company": company,
                    "location": loc,
                    "country": c,
                    "url": url
                })
        except Exception as e:
            sys.stderr.write(f"Scraper error [{label}]: {e}\n")

    print(json.dumps(all_jobs))

if __name__ == "__main__":
    main()
