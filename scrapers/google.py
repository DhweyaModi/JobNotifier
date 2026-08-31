import sys
import requests
from scrapers.base_scraper import role_matches, is_internship

BASE_URL = "https://careers.google.com/api/v3/search/"
ALT_URL = "https://www.google.com/about/careers/applications/api/jobs/results/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Referer": "https://www.google.com/about/careers/applications/jobs/results",
}


def fetch_google_jobs():
    """
    Fetches student and engineering internship postings from Google Careers API using target_level=INTERN_AND_APPRENTICE.
    Returns a list of (unique_id, title, company, location, url, date_posted) tuples.
    """
    results = []
    seen_ids = set()

    # Query with Google's official internship & apprentice target_level facet
    param_sets = [
        {"target_level": "INTERN_AND_APPRENTICE", "page_size": 100, "sort_by": "relevance"},
        {"q": "intern", "page_size": 100, "sort_by": "relevance"},
    ]

    for params in param_sets:
        try:
            resp = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=20)
            if resp.status_code != 200:
                resp = requests.get(ALT_URL, params=params, headers=HEADERS, timeout=20)

            if resp.status_code != 200:
                print(f"Warning: Google Careers API returned HTTP {resp.status_code}", file=sys.stderr)
                continue

            data = resp.json()
            jobs = data.get("jobs", [])

            for job in jobs:
                job_id = job.get("id")
                if not job_id or job_id in seen_ids:
                    continue

                title = job.get("title", "").strip()
                company = "Google"

                # Parse locations list
                raw_locations = job.get("locations", [])
                if isinstance(raw_locations, list):
                    loc_strings = []
                    for item in raw_locations:
                        if isinstance(item, str):
                            loc_strings.append(item)
                        elif isinstance(item, dict):
                            loc_str = item.get("display_name") or item.get("city") or ""
                            if loc_str:
                                loc_strings.append(loc_str)
                    location = ", ".join(loc_strings) if loc_strings else "Multiple Locations"
                elif isinstance(raw_locations, str):
                    location = raw_locations
                else:
                    location = "Multiple Locations"

                # Extract apply url
                apply_url = (
                    job.get("apply_url")
                    or f"https://www.google.com/about/careers/applications/jobs/results/{job_id}"
                )

                uid = f"google:{job_id}"

                # Filters: verify tech role or internship keyword
                title_lower = title.lower()
                is_student_researcher = "student researcher" in title_lower or "step" in title_lower
                if not (role_matches(title) or is_internship(title) or is_student_researcher):
                    continue

                created_date = job.get("created") or job.get("modified") or ""
                seen_ids.add(job_id)
                results.append((uid, title, company, location, apply_url, created_date))

        except Exception as e:
            print(f"Warning: Error fetching Google jobs: {e}", file=sys.stderr)

    return results
