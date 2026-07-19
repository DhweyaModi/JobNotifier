import sys
import re
import requests
from scrapers.base_scraper import (
    role_matches,
    is_internship,
    _iter_table_rows,
    _is_junk_row,
    _strip_html
)

SUMMER2027_README_URL = (
    "https://raw.githubusercontent.com/sndsh404/"
    "summer-2027-internships/main/README.md"
)

def _extract_markdown_link(cell: str) -> str:
    m = re.search(r'\]\((https?://[^\s\)]+)\)', cell)
    if m:
        return m.group(1).strip()
    m2 = re.search(r'(https?://[^\s\)\"\>]+)', cell)
    return m2.group(1).strip() if m2 else ""

def fetch_summer2027_jobs():
    """
    Fetch and parse sndsh404/summer-2027-internships README.md markdown table line-by-line.
    Returns list of matching job tuples.
    """
    try:
        resp = requests.get(SUMMER2027_README_URL, timeout=30)
        resp.raise_for_status()
    except Exception as exc:
        print(f"[summer2027] WARN: {exc}", file=sys.stderr)
        return []

    results = []
    for cells in _iter_table_rows(resp.text, min_cols=4):
        company_raw = cells[0]
        title = cells[1]
        location = cells[2]
        apply_cell = cells[3]

        if _is_junk_row(company_raw, title):
            continue

        company = _strip_html(company_raw)
        url = _extract_markdown_link(apply_cell)

        if not role_matches(title):
            continue
        if not is_internship(title):
            continue

        uid = f"summer2027:{company}:{title}:{url}"
        results.append((uid, title, company, location, url))

    return results
