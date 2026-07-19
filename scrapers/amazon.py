import sys
import requests
from scrapers.base_scraper import role_matches, is_internship

AMAZON_LOCATIONS = [
    {"country": "CAN", "label": "Canada"},
    {"country": "USA", "state": "WA", "label": "Seattle, WA, USA"},
]

AMAZON_SEARCH_URL = "https://www.amazon.jobs/en/search.json"

AMAZON_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Referer": "https://www.amazon.jobs/en/search?base_query=software+engineer",
}

def fetch_amazon_jobs():
    """
    Fetches the amazon.jobs JSON search API.
    Returns a list of (unique_id, title, company, location, url) tuples.
    """
    results = []

    for loc in AMAZON_LOCATIONS:
        params = {
            "category[]": "software-development",
            "country[]": loc["country"],
            "result_limit": 50,
            "sort": "recent",
            "offset": 0,
        }
        if "state" in loc:
            params["normalized_state_name[]"] = loc["state"]

        try:
            resp = requests.get(
                AMAZON_SEARCH_URL, params=params, timeout=30, headers=AMAZON_HEADERS
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            print(f"[amazon] WARN: {exc}", file=sys.stderr)
            continue

        for job in data.get("jobs", []):
            title = job.get("title", "")
            job_id = job.get("id_icims") or job.get("id")
            url_path = job.get("job_path", "")
            url = f"https://www.amazon.jobs{url_path}" if url_path else ""
            location_str = job.get("location", loc["label"])

            if not role_matches(title):
                continue
            if not is_internship(title):
                continue

            uid = f"amazon:{job_id}"
            results.append((uid, title, "Amazon", location_str, url))

    return results
