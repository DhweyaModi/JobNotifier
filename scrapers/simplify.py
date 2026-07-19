import requests
from scrapers.base_scraper import role_matches, is_internship

SIMPLIFY_URL = (
    "https://raw.githubusercontent.com/SimplifyJobs/"
    "Summer2026-Internships/dev/.github/scripts/listings.json"
)

def fetch_simplify_jobs():
    """
    Fetches the SimplifyJobs JSON listings file.
    Returns a list of (unique_id, title, company, location, url) tuples.
    """
    resp = requests.get(SIMPLIFY_URL, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    results = []

    for entry in data:
        if not entry.get("active", True):
            continue
        if not entry.get("is_visible", True):
            continue

        title = entry.get("title", "")
        company = entry.get("company_name", "")
        locations = entry.get("locations", [])
        location_str = ", ".join(locations)
        url = entry.get("url", "")
        uid = f"simplify:{entry.get('id')}"

        if not role_matches(title):
            continue
        if not is_internship(title):
            continue

        results.append((uid, title, company, location_str, url))

    return results
