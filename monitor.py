"""
Job board monitor.

Sources:
  1. SimplifyJobs Summer2026-Internships (listings.json)
  2. negarprh/Canadian-Tech-Internships-2026 (README table, parsed)
  3. amazon.jobs JSON search API

Notifies new matching postings to a Slack Incoming Webhook.

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
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL")

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

SIMPLIFY_TERMS = {"Summer 2026", "Fall 2026", "Off-Season"}  # adjust as needed


def location_matches(location_text: str) -> bool:
    loc = location_text.lower()
    return any(k in loc for k in LOCATION_KEYWORDS)


def role_matches(title_text: str) -> bool:
    title = title_text.lower()
    return any(k in title for k in ROLE_KEYWORDS)


# --- State -------------------------------------------------------------------

def load_seen() -> set:
    if STATE_FILE.exists():
        return set(json.loads(STATE_FILE.read_text()))
    return set()


def save_seen(seen: set) -> None:
    STATE_FILE.write_text(json.dumps(sorted(seen), indent=2))


# --- Source 1: SimplifyJobs --------------------------------------------------

SIMPLIFY_URL = (
    "https://raw.githubusercontent.com/SimplifyJobs/"
    "Summer2026-Internships/dev/.github/scripts/listings.json"
)


def fetch_simplify_jobs():
    """Returns a list of (unique_id, title, company, location, url) tuples."""
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
        if not location_matches(location_str):
            continue

        results.append((uid, title, company, location_str, url))

    return results


# --- Source 2: negarprh/Canadian-Tech-Internships-2026 ----------------------

CANADIAN_README_URL = (
    "https://raw.githubusercontent.com/negarprh/"
    "Canadian-Tech-Internships-2026/main/README.md"
)

# Matches markdown table rows like:
# | Company | Role | Location | [![Apply](badge_url)](apply_url) | Date Posted |
MD_ROW_RE = re.compile(
    r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*\[!\[.*?\]\(.*?\)\]\((.+?)\)\s*\|",
    re.MULTILINE,
)


def fetch_canadian_jobs():
    """Returns a list of (unique_id, title, company, location, url) tuples."""
    resp = requests.get(CANADIAN_README_URL, timeout=30)
    if resp.status_code != 200:
        # Repo/branch name may differ; fail soft so the rest of the run continues.
        print(f"[canadian] WARN: status {resp.status_code} for README", file=sys.stderr)
        return []

    text = resp.text
    results = []

    for match in MD_ROW_RE.finditer(text):
        company, title, location, url = match.groups()

        # Skip header/separator rows and "scroll down" arrow rows (same company as above)
        if title.lower() in ("role", "position") or set(title) <= {"-", " ", ":"}:
            continue
        if set(company) <= {"-", " ", ":"}:
            continue
        if company == "↳":
            continue  # would need to track previous company; skip for now

        if not role_matches(title):
            continue
        if not location_matches(location):
            continue

        uid = f"canadian:{company}:{title}:{url}"
        results.append((uid, title, company, location, url))

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


def fetch_amazon_jobs():
    """Returns a list of (unique_id, title, company, location, url) tuples."""
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

            uid = f"amazon:{job_id}"
            results.append((uid, title, "Amazon", location_str, url))

    return results


# --- Slack notification -------------------------------------------------------

def send_slack_message(text: str) -> None:
    if not SLACK_WEBHOOK_URL:
        print("WARN: SLACK_WEBHOOK_URL not set, skipping notification", file=sys.stderr)
        print(text)
        return

    resp = requests.post(SLACK_WEBHOOK_URL, json={"text": text}, timeout=15)
    resp.raise_for_status()


def format_job_message(source_label: str, title: str, company: str, location: str, url: str) -> str:
    return f"*[{source_label}]* {title} @ {company} — _{location}_\n{url}"


# --- Main ----------------------------------------------------------------------

def main():
    seen = load_seen()
    new_jobs = []

    for fetch_fn, label in (
        (fetch_simplify_jobs, "SimplifyJobs"),
        (fetch_canadian_jobs, "Canadian-Tech-Internships"),
        (fetch_amazon_jobs, "Amazon"),
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
            new_jobs.append((label, title, company, location, url))

    if new_jobs:
        # Batch into one message (or send individually if you prefer pings per job)
        lines = [format_job_message(*job) for job in new_jobs]
        message = f":briefcase: *{len(new_jobs)} new matching job(s) found!*\n\n" + "\n\n".join(lines)
        send_slack_message(message)
        print(f"Sent {len(new_jobs)} new job(s) to Slack.")
    else:
        print("No new jobs found.")

    save_seen(seen)


if __name__ == "__main__":
    main()