import sys
import requests
from scrapers.base_scraper import (
    role_matches,
    extract_link,
    _iter_table_rows,
    _is_junk_row,
    _strip_html
)

VANSH_README_URL = (
    "https://raw.githubusercontent.com/vanshb03/"
    "Summer2027-Internships/main/README.md"
)

def fetch_vansh_jobs():
    """
    Parse vanshb03/Summer2027-Internships README.md table.
    Columns: Company | Role | Location | Application/Link | Date Posted
    """
    try:
        resp = requests.get(VANSH_README_URL, timeout=30)
        resp.raise_for_status()
    except Exception as exc:
        print(f"[vansh] WARN: {exc}", file=sys.stderr)
        return []

    results = []
    last_company = ""

    for cells in _iter_table_rows(resp.text, min_cols=5):
        company_raw, title, location, link_cell, _date = cells[:5]

        if _is_junk_row(company_raw, title):
            continue

        # Handle ↳ continuation rows — same company as the row above
        if company_raw.strip() == "↳":
            company = last_company
        else:
            company = _strip_html(company_raw)
            last_company = company

        url = extract_link(link_cell)

        if not role_matches(title):
            continue

        uid = f"vansh:{company}:{title}:{url}"
        results.append((uid, title, company, location, url))

    return results

