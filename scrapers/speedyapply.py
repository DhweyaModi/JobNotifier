import sys
import requests
from scrapers.base_scraper import (
    role_matches,
    is_internship,
    extract_link,
    _iter_table_rows,
    _is_junk_row,
    _strip_html
)

SPEEDYAPPLY_SOURCES = [
    (
        "speedyapply-ai",
        "https://raw.githubusercontent.com/speedyapply/"
        "2027-AI-College-Jobs/main/README.md",
    ),
    (
        "speedyapply-swe",
        "https://raw.githubusercontent.com/speedyapply/"
        "2027-SWE-College-Jobs/main/README.md",
    ),
]

SPEEDYAPPLY_SWE_NEWGRAD_SOURCES = [
    (
        "speedyapply-swe-newgrad-usa",
        "https://raw.githubusercontent.com/speedyapply/"
        "2027-SWE-College-Jobs/main/NEW_GRAD_USA.md",
    ),
    (
        "speedyapply-swe-newgrad-intl",
        "https://raw.githubusercontent.com/speedyapply/"
        "2027-SWE-College-Jobs/main/NEW_GRAD_INTL.md",
    ),
]

SPEEDYAPPLY_AI_NEWGRAD_SOURCES = [
    (
        "speedyapply-ai-newgrad-usa",
        "https://raw.githubusercontent.com/speedyapply/"
        "2027-AI-College-Jobs/main/NEW_GRAD_USA.md",
    ),
    (
        "speedyapply-ai-newgrad-intl",
        "https://raw.githubusercontent.com/speedyapply/"
        "2027-AI-College-Jobs/main/NEW_GRAD_INTL.md",
    ),
]

def _fetch_speedyapply_source(label: str, url: str, is_newgrad: bool = False):
    """Parse a speedyapply README.md or markdown table.
    Handles both 6-column tables (Company | Position | Location | Salary | Posting | Age)
    and 5-column tables (Company | Position | Location | Posting | Age).
    """
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as exc:
        print(f"[{label}] WARN: {exc}", file=sys.stderr)
        return []

    results = []

    for cells in _iter_table_rows(resp.text, min_cols=5):
        if len(cells) >= 6:
            company_raw, title, location, _salary, posting_cell, _age = cells[:6]
        else:
            company_raw, title, location, posting_cell, _age = cells[:5]

        if _is_junk_row(company_raw, title):
            continue

        company = _strip_html(company_raw)
        url_ = extract_link(posting_cell)
        date_posted = _strip_html(_age) if _age else ""

        if not role_matches(title):
            continue

        # Strictly discard any stray internships from New Grad boards
        if is_newgrad and is_internship(title):
            continue

        uid = f"{label}:{company}:{title}:{url_}"
        results.append((uid, title, company, location, url_, date_posted))

    return results

def fetch_speedyapply_ai_jobs():
    label, url = SPEEDYAPPLY_SOURCES[0]
    return _fetch_speedyapply_source(label, url, is_newgrad=False)

def fetch_speedyapply_swe_jobs():
    label, url = SPEEDYAPPLY_SOURCES[1]
    return _fetch_speedyapply_source(label, url, is_newgrad=False)

def fetch_speedyapply_swe_newgrad_jobs():
    """Fetches 2027 Software Engineering New Grad listings (USA & International) from speedyapply."""
    all_jobs = []
    for label, url in SPEEDYAPPLY_SWE_NEWGRAD_SOURCES:
        all_jobs.extend(_fetch_speedyapply_source(label, url, is_newgrad=True))
    return all_jobs

def fetch_speedyapply_ai_newgrad_jobs():
    """Fetches 2027 AI/ML New Grad listings (USA & International) from speedyapply."""
    all_jobs = []
    for label, url in SPEEDYAPPLY_AI_NEWGRAD_SOURCES:
        all_jobs.extend(_fetch_speedyapply_source(label, url, is_newgrad=True))
    return all_jobs


