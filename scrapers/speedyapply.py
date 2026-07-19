import sys
import requests
from scrapers.base_scraper import (
    role_matches,
    is_internship,
    _iter_table_rows,
    _is_junk_row,
    _strip_html,
    _extract_href
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

def _fetch_speedyapply_source(label: str, url: str):
    """Parse a speedyapply README.md table.
    Columns: Company | Position | Location | Salary | Posting | Age
    """
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as exc:
        print(f"[{label}] WARN: {exc}", file=sys.stderr)
        return []

    results = []

    for cells in _iter_table_rows(resp.text, min_cols=6):
        company_raw, title, location, _salary, posting_cell, _age = cells[:6]

        if _is_junk_row(company_raw, title):
            continue

        company = _strip_html(company_raw)
        url_ = _extract_href(posting_cell)

        if not role_matches(title):
            continue
        if not is_internship(title):
            continue

        uid = f"{label}:{company}:{title}:{url_}"
        results.append((uid, title, company, location, url_))

    return results

def fetch_speedyapply_ai_jobs():
    label, url = SPEEDYAPPLY_SOURCES[0]
    return _fetch_speedyapply_source(label, url)

def fetch_speedyapply_swe_jobs():
    label, url = SPEEDYAPPLY_SOURCES[1]
    return _fetch_speedyapply_source(label, url)
