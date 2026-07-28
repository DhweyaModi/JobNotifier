import sys
import requests
from scrapers.base_scraper import (
    role_matches,
    extract_link,
    _iter_table_rows,
    _is_junk_row,
    _strip_html
)

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

def _parse_canadian_readme(text: str, year_label: str):
    results = []
    last_company = ""

    for cells in _iter_table_rows(text, min_cols=4):
        # Columns: Company | Role | Location | Application Link/Status [| Date Posted]
        company_raw = cells[0]
        title = cells[1]
        location = cells[2]
        apply_cell = cells[3]

        if _is_junk_row(company_raw, title):
            continue

        # Handle ↳ rows — same company as the row above
        if company_raw.strip() == "↳":
            company = last_company
        else:
            company = _strip_html(company_raw)
            last_company = company

        url = extract_link(apply_cell)

        if not role_matches(title):
            continue

        uid = f"canadian-{year_label}:{company}:{title}:{url}"
        results.append((uid, title, company, location, url))

    return results

def fetch_canadian_jobs():
    """
    Fetch both 2026 and 2027 Canadian READMEs and parse them line-by-line.
    Returns combined list of matching job tuples.
    """
    results = []
    for year_label, url in CANADIAN_README_URLS:
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
        except Exception as exc:
            print(f"[canadian-{year_label}] WARN: {exc}", file=sys.stderr)
            continue

        results.extend(_parse_canadian_readme(resp.text, year_label))
    return results

