import sys
import requests
from scrapers.base_scraper import (
    role_matches,
    extract_link,
    _iter_table_rows,
    _is_junk_row,
    _strip_html
)

SUMMER2027_README_URL = (
    "https://raw.githubusercontent.com/sndsh404/"
    "summer-2027-internships/main/README.md"
)

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

        company = _strip_html(company_raw)
        url = extract_link(apply_cell)
        date_posted = _strip_html(cells[4]) if len(cells) > 4 else ""

        if not role_matches(title):
            continue

        uid = f"summer2027:{company}:{title}:{url}"
        results.append((uid, title, company, location, url, date_posted))

    return results

