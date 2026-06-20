"""
Job board monitor.

Sources:
  1. SimplifyJobs Summer2026-Internships (listings.json)
  2. negarprh/Canadian-Tech-Internships-2026 (README.md + README-2027.md tables, parsed)
  3. amazon.jobs JSON search API
  4. sndsh404/summer-2027-internships (README.md markdown table, parsed)

Notifies new matching postings to separate Slack channels by country
(Canada / USA) via two Incoming Webhooks. Jobs that match both countries
(e.g. multi-location listings) are sent to both channels.

State (seen job IDs) is persisted to seen_jobs.json, which the GitHub
Action commits back to the repo each run.
"""

import json
import os
import re
import sys
from pathlib import Path

import requests

STATE_FILE = Path(__file__).parent / "seen_jobs.json"

SLACK_WEBHOOK_CANADA = os.environ.get("SLACK_WEBHOOK_CANADA")  # GitHub secret -> Canada channel
SLACK_WEBHOOK_USA = os.environ.get("SLACK_WEBHOOK_USA")  # GitHub secret -> USA channel

# --- Filters ---------------------------------------------------------------

LOCATION_KEYWORDS = [
    "canada", "vancouver", "toronto", "bc", "ontario", "remote - canada",
    "seattle", "wa", "washington",
]

ROLE_KEYWORDS = [
    "software", "swe", "engineer", "engineering", "developer", "data",
    "machine learning", "ml", "ai", "backend", "frontend", "full stack",
    "full-stack",
]

INTERNSHIP_KEYWORDS = [
    "intern", "internship", "co-op", "coop", "co op",
]


def location_matches(location_text: str) -> bool:
    # Location filtering disabled for now — re-enable by uncommenting below.
    return True
    # loc = location_text.lower()
    # return any(k in loc for k in LOCATION_KEYWORDS)


def role_matches(title_text: str) -> bool:
    title = title_text.lower()
    return any(k in title for k in ROLE_KEYWORDS)


def is_internship(title_text: str) -> bool:
    title = title_text.lower()
    return any(k in title for k in INTERNSHIP_KEYWORDS)


# --- Country classification (Canada / USA / both / other) -------------------

US_STATES = {
    "al", "alabama", "ak", "alaska", "az", "arizona", "ar", "arkansas",
    "ca", "california", "co", "colorado", "ct", "connecticut", "de", "delaware",
    "fl", "florida", "ga", "georgia", "hi", "hawaii", "id", "idaho",
    "il", "illinois", "in", "indiana", "ia", "iowa", "ks", "kansas",
    "ky", "kentucky", "la", "louisiana", "me", "maine", "md", "maryland",
    "ma", "massachusetts", "mi", "michigan", "mn", "minnesota", "ms", "mississippi",
    "mo", "missouri", "mt", "montana", "ne", "nebraska", "nv", "nevada",
    "nh", "new hampshire", "nj", "new jersey", "nm", "new mexico", "ny", "new york",
    "nc", "north carolina", "nd", "north dakota", "oh", "ohio", "ok", "oklahoma",
    "or", "oregon", "pa", "pennsylvania", "ri", "rhode island", "sc", "south carolina",
    "sd", "south dakota", "tn", "tennessee", "tx", "texas", "ut", "utah",
    "vt", "vermont", "va", "virginia", "wa", "washington", "wv", "west virginia",
    "wi", "wisconsin", "wy", "wyoming", "dc",
}

CA_PROVINCES = {
    "ab", "alberta", "bc", "british columbia", "mb", "manitoba",
    "nb", "new brunswick", "nl", "newfoundland", "ns", "nova scotia",
    "nt", "northwest territories", "nu", "nunavut", "on", "ontario",
    "pe", "prince edward island", "qc", "quebec", "sk", "saskatchewan",
    "yt", "yukon",
}

USA_NAME_HINTS = [
    "usa", "united states", "u.s.", "u.s.a", "nyc", "sf", "bay area",
    "silicon valley", "new york city",
]
CANADA_NAME_HINTS = ["canada", "ca"]


def _tokenize_location(location_text: str) -> list:
    # Split on commas/slashes/parens, strip whitespace, lowercase
    parts = re.split(r"[,/()]", location_text.lower())
    return [p.strip() for p in parts if p.strip()]


def classify_country(location_text: str) -> str:
    """Returns 'canada', 'usa', 'both', or 'other' based on location text."""
    tokens = _tokenize_location(location_text)
    token_set = set(tokens)

    is_usa = bool(token_set & US_STATES) or any(h in location_text.lower() for h in USA_NAME_HINTS)
    is_canada = bool(token_set & CA_PROVINCES) or any(h in location_text.lower() for h in CANADA_NAME_HINTS)

    if is_canada and is_usa:
        return "both"
    if is_canada:
        return "canada"
    if is_usa:
        return "usa"
    return "other"


# --- State -------------------------------------------------------------------

def load_seen() -> set:
    if STATE_FILE.exists():
        return set(json.loads(STATE_FILE.read_text()))
    return set()


def save_seen(seen: set) -> None:
    STATE_FILE.write_text(json.dumps(sorted(seen), indent=2))


# --- Source 1: SimplifyJobs --------------------------------------------------

# SimplifyJobs Summer2026-Internships listings.json
SIMPLIFY_URL = (
    "https://raw.githubusercontent.com/SimplifyJobs/"
    "Summer2026-Internships/dev/.github/scripts/listings.json"
)

""" Fetches the JSON file via HTTP GET and returns a list of (unique_id, title, company, location, url) tuples. """
def fetch_simplify_jobs():
    resp = requests.get(SIMPLIFY_URL, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    results = []

    # For each entry, check if it's active and visible, then filter by role, internship, and location.
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
        if not location_matches(location_str):
            continue

        results.append((uid, title, company, location_str, url))

    return results


# --- Source 2: negarprh/Canadian-Tech-Internships-2026 ----------------------

# Split into tuples of (year_label, url) for easier parsing and unique ID generation later.
CANADIAN_README_URLS = [
    (
        "2026",
        "https://raw.githubusercontent.com/negarprh/"
        "Canadian-Tech-Internships-2026/main/README.md",
    ),
    (
        "2027",
        "https://raw.githubusercontent.com/negarprh/"
        "Canadian-Tech-Internships-2026/main/README-2027.md",
    ),
]

# Matches markdown table rows like:
# | Company | Role | Location | [![Apply](badge_url)](apply_url) | Date Posted |
MD_ROW_RE = re.compile(
    r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*\[!\[.*?\]\(.*?\)\]\((.+?)\)\s*\|",
    re.MULTILINE,
)

"""Parse a Canadian-Tech-Internships README and return job tuples."""
def _parse_canadian_readme(text: str, year_label: str):
    results = []
    last_company = ""

    # Iterates over all markdown table rows, extracting company, title, location, and URL.
    for match in MD_ROW_RE.finditer(text):
        company, title, location, url = match.groups()

        # Skip header/separator rows
        if title.lower() in ("role", "position") or set(title) <= {"-", " ", ":"}:
            continue
        if set(company) <= {"-", " ", ":"}:
            continue

        # Handle ↳ rows — same company as the row above
        if company.strip() == "↳":
            company = last_company
        else:
            last_company = company

        if not role_matches(title):
            continue
        if not is_internship(title):
            continue
        if not location_matches(location):
            continue

        uid = f"canadian-{year_label}:{company}:{title}:{url}"
        results.append((uid, title, company, location, url))

    return results

"""Fetch both 2026 and 2027 Canadian READMEs and return combined job tuples."""
def fetch_canadian_jobs():
    results = []

    # HTTP request for each README, then parse with the helper function. Unique IDs include the year label to avoid collisions between the two lists.
    for year_label, url in CANADIAN_README_URLS:
        try:
            resp = requests.get(url, timeout=30)
        except Exception as exc:
            print(f"[canadian-{year_label}] WARN: {exc}", file=sys.stderr)
            continue

        if resp.status_code != 200:
            print(f"[canadian-{year_label}] WARN: status {resp.status_code}", file=sys.stderr)
            continue

        results.extend(_parse_canadian_readme(resp.text, year_label))

    return results


# --- Source 3: amazon.jobs ----------------------------------------------------

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

"""
Returns a list of (unique_id, title, company, location, url) tuples.
HTTP GET to amazon.jobs search API for software development internships in specified locations, then filter and format results.
"""
def fetch_amazon_jobs():
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


# --- Source 4: sndsh404/summer-2027-internships -----------------------------

SUMMER2027_README_URL = (
    "https://raw.githubusercontent.com/sndsh404/"
    "summer-2027-internships/main/README.md"
)

# Matches markdown table rows like:
# | Company | Role | Location | [apply](url) | Added |
SUMMER2027_ROW_RE = re.compile(
    r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*\[apply\]\((.+?)\)\s*\|",
    re.MULTILINE,
)


def fetch_summer2027_jobs():
    """Parse sndsh404/summer-2027-internships README.md markdown table.

    Returns a list of (unique_id, title, company, location, url) tuples.
    """
    try:
        resp = requests.get(SUMMER2027_README_URL, timeout=30)
    except Exception as exc:
        print(f"[summer2027] WARN: {exc}", file=sys.stderr)
        return []

    if resp.status_code != 200:
        print(f"[summer2027] WARN: status {resp.status_code} for README", file=sys.stderr)
        return []

    text = resp.text
    results = []

    for match in SUMMER2027_ROW_RE.finditer(text):
        company, title, location, url = match.groups()

        # Skip header/separator rows
        if title.lower() in ("role", "position") or set(title) <= {"-", " ", ":"}:
            continue
        if set(company) <= {"-", " ", ":"}:
            continue

        if not role_matches(title):
            continue
        if not is_internship(title):
            continue
        if not location_matches(location):
            continue

        uid = f"summer2027:{company}:{title}:{url}"
        results.append((uid, title, company, location, url))

    return results


# --- Slack notification -------------------------------------------------------

def send_slack_message(webhook_url, text: str, channel_label: str = "") -> None:
    if not webhook_url:
        print(f"WARN: webhook URL not set for [{channel_label}], skipping notification", file=sys.stderr)
        print(text)
        return

    resp = requests.post(webhook_url, json={"text": text}, timeout=15)
    resp.raise_for_status()


def format_job_message(source_label: str, title: str, company: str, location: str, url: str) -> str:
    """Format a job posting for Slack with company first, then title, location, and source."""
    # Build the apply link — Slack format: <url|text> makes a clickable link
    apply_link = f"<{url}|Apply>" if url else "No link"
    return (
        f"🏢 *{company}* — {title} — 📍 {location}\n"
        f"   🔗 {apply_link}\n"
        f"   📋 _Source: {source_label}_"
    )


# --- Main ----------------------------------------------------------------------

def main():
    seen = load_seen()
    canada_jobs = []
    usa_jobs = []
    other_jobs = []  # location didn't clearly match Canada or USA — logged, not sent

    # Fetch jobs from each source, filter out already seen ones, classify by country.
    for fetch_fn, label in (
        (fetch_simplify_jobs, "SimplifyJobs"),
        (fetch_canadian_jobs, "Canadian-Tech-Internships"),
        (fetch_amazon_jobs, "Amazon"),
        (fetch_summer2027_jobs, "Summer2027-Internships"),
    ):
        try:
            jobs = fetch_fn()
        except Exception as exc:
            print(f"[{label}] ERROR: {exc}", file=sys.stderr)
            continue

        for uid, title, company, location, url in jobs:
            if uid in seen:
                continue
            seen.add(uid)

            country = classify_country(location)
            job_tuple = (label, title, company, location, url)

            if country == "canada":
                canada_jobs.append(job_tuple)
            elif country == "usa":
                usa_jobs.append(job_tuple)
            elif country == "both":
                # Matches both Canada and USA (e.g. multi-location listing) — send to both channels
                canada_jobs.append(job_tuple)
                usa_jobs.append(job_tuple)
            else:
                other_jobs.append(job_tuple)

    if canada_jobs:
        lines = [format_job_message(*job) for job in canada_jobs]
        message = f":maple_leaf: *{len(canada_jobs)} new Canada job(s) found!*\n\n" + "\n\n".join(lines)
        send_slack_message(SLACK_WEBHOOK_CANADA, message, "Canada")
        print(f"Sent {len(canada_jobs)} new job(s) to Canada channel.")

    if usa_jobs:
        lines = [format_job_message(*job) for job in usa_jobs]
        message = f":flag-us: *{len(usa_jobs)} new USA job(s) found!*\n\n" + "\n\n".join(lines)
        send_slack_message(SLACK_WEBHOOK_USA, message, "USA")
        print(f"Sent {len(usa_jobs)} new job(s) to USA channel.")

    if other_jobs:
        # Not sent to Slack — logged so nothing silently disappears.
        print(f"{len(other_jobs)} new job(s) didn't clearly match Canada or USA, skipped:", file=sys.stderr)
        for label, title, company, location, _ in other_jobs:
            print(f"  [{label}] {company} — {title} — {location}", file=sys.stderr)

    if not (canada_jobs or usa_jobs or other_jobs):
        print("No new jobs found.")

    save_seen(seen)



if __name__ == "__main__":
    main()