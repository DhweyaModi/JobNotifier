import re
import sys
import json
import html as html_lib
import requests
from scrapers.base_scraper import role_matches, is_internship

INTERN_URLS = [
    "https://www.google.com/about/careers/applications/jobs/results?target_level=INTERN_AND_APPRENTICE&location=United%20States",
    "https://www.google.com/about/careers/applications/jobs/results?target_level=INTERN_AND_APPRENTICE&location=Canada",
    "https://www.google.com/about/careers/applications/jobs/results?target_level=INTERN_AND_APPRENTICE",
    "https://www.google.com/about/careers/applications/jobs/results?q=Software%20Engineer%20Intern",
    "https://www.google.com/about/careers/applications/jobs/results?q=Student%20Researcher",
]

URLS = INTERN_URLS

NEWGRAD_URLS = [
    "https://www.google.com/about/careers/applications/jobs/results?target_level=EARLY&location=United%20States",
    "https://www.google.com/about/careers/applications/jobs/results?target_level=EARLY&location=Canada",
    "https://www.google.com/about/careers/applications/jobs/results?q=University%20Graduate",
    "https://www.google.com/about/careers/applications/jobs/results?q=Software%20Developer%20Early%20Career",
    "https://www.google.com/about/careers/applications/jobs/results?q=Software%20Engineer%20Campus",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
}


def _extract_from_callbacks(html_text):
    """
    Parses Google Careers AF_initDataCallback payload embedded in server-rendered script tags.
    Extracts all job listings, IDs, titles, locations, and timestamps.
    """
    jobs = []
    callbacks = re.findall(
        r"AF_initDataCallback\(\{key: \x27ds:1\x27.*?, data:(.*?)(?:, sideChannel:|\}\);)",
        html_text,
        re.DOTALL,
    )
    if not callbacks:
        return jobs

    try:
        data = json.loads(callbacks[0].strip())
        raw_jobs = data[0] if data and len(data) > 0 else []
        for j in raw_jobs:
            if not isinstance(j, list) or len(j) < 2:
                continue

            job_id = str(j[0]).strip()
            title = html_lib.unescape(str(j[1])).strip()

            # Location array is stored at index 9: [ ['City, Region, Country', ...], ... ]
            locs = []
            if len(j) > 9 and isinstance(j[9], list):
                for loc_item in j[9]:
                    if isinstance(loc_item, list) and len(loc_item) > 0 and isinstance(loc_item[0], str):
                        locs.append(loc_item[0])

            location_str = ", ".join(locs) if locs else "Multiple Locations"
            ts = j[12][0] if len(j) > 12 and isinstance(j[12], list) and len(j[12]) > 0 else 0

            jobs.append({
                "id": job_id,
                "title": title,
                "location": location_str,
                "url": f"https://www.google.com/about/careers/applications/jobs/results/{job_id}",
                "timestamp": ts,
            })
    except Exception as exc:
        print(f"Warning: Failed to parse Google Careers JSON callback: {exc}", file=sys.stderr)

    return jobs


def fetch_google_jobs():
    """
    Fetches student, intern, and apprentice postings from Google Careers.
    Returns a list of (unique_id, title, company, location, url, date_posted) tuples.
    """
    results = []
    seen_ids = set()

    for url in INTERN_URLS:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=25)
            if resp.status_code != 200:
                print(f"Warning: Google Careers page returned HTTP {resp.status_code}", file=sys.stderr)
                continue

            raw_jobs = _extract_from_callbacks(resp.text)

            for item in raw_jobs:
                job_id = item["id"]
                title = item["title"]

                if not job_id or not title or job_id in seen_ids:
                    continue

                title_lower = title.lower()
                is_student_role = (
                    "student researcher" in title_lower
                    or "step" in title_lower
                    or "fellow" in title_lower
                    or "apprentice" in title_lower
                )
                if not (role_matches(title) or is_internship(title) or is_student_role):
                    continue

                company = "Google"
                loc = item["location"]
                apply_url = item["url"]
                uid = f"google:{job_id}"
                date_posted = str(item["timestamp"]) if item["timestamp"] else ""

                seen_ids.add(job_id)
                results.append((uid, title, company, loc, apply_url, date_posted))

        except Exception as e:
            print(f"Warning: Error fetching Google jobs from {url}: {e}", file=sys.stderr)

    return results


def fetch_google_newgrad_jobs():
    """
    Fetches early career and university graduate postings from Google Careers.
    Returns a list of (unique_id, title, company, location, url, date_posted) tuples.
    """
    results = []
    seen_ids = set()

    for url in NEWGRAD_URLS:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=25)
            if resp.status_code != 200:
                print(f"Warning: Google Careers page returned HTTP {resp.status_code}", file=sys.stderr)
                continue

            raw_jobs = _extract_from_callbacks(resp.text)

            for item in raw_jobs:
                job_id = item["id"]
                title = item["title"]

                if not job_id or not title or job_id in seen_ids:
                    continue

                title_lower = title.lower()
                # Exclude internships so they route strictly to internship channels
                if is_internship(title) or "student researcher" in title_lower:
                    continue

                if not role_matches(title):
                    continue

                company = "Google"
                loc = item["location"]
                apply_url = item["url"]
                uid = f"google-newgrad:{job_id}"
                date_posted = str(item["timestamp"]) if item["timestamp"] else ""

                seen_ids.add(job_id)
                results.append((uid, title, company, loc, apply_url, date_posted))

        except Exception as e:
            print(f"Warning: Error fetching Google new grad jobs from {url}: {e}", file=sys.stderr)

    return results
