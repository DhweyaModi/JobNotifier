import requests
from scrapers.base_scraper import role_matches, is_internship

SIMPLIFY_INTERNSHIPS_URL = (
    "https://raw.githubusercontent.com/SimplifyJobs/"
    "Summer2026-Internships/dev/.github/scripts/listings.json"
)

SIMPLIFY_NEWGRAD_URL = (
    "https://raw.githubusercontent.com/SimplifyJobs/"
    "New-Grad-Positions/dev/.github/scripts/listings.json"
)


def _fetch_from_simplify_json(url: str, id_prefix: str = "simplify", is_newgrad: bool = False):
    """
    Generic helper to fetch and parse a SimplifyJobs JSON repository.
    Returns a list of (unique_id, title, company, location, url, date_posted) tuples.
    """
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []

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
        url_link = entry.get("url", "")
        uid = f"{id_prefix}:{entry.get('id')}"

        if not role_matches(title):
            continue

        # Strictly discard any stray internships that were submitted to the New Grad board
        if is_newgrad and is_internship(title):
            continue

        date_posted = entry.get("date_posted") or entry.get("date_updated")
        results.append((uid, title, company, location_str, url_link, date_posted))

    return results


def fetch_simplify_jobs():
    """
    Fetches the SimplifyJobs Summer 2026 Internships listings.
    """
    return _fetch_from_simplify_json(SIMPLIFY_INTERNSHIPS_URL, id_prefix="simplify", is_newgrad=False)


def fetch_simplify_newgrad_jobs():
    """
    Fetches the SimplifyJobs New-Grad-Positions listings.
    """
    return _fetch_from_simplify_json(SIMPLIFY_NEWGRAD_URL, id_prefix="simplify-newgrad", is_newgrad=True)


