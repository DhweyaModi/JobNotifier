"""
Header-driven scrapers for community-maintained GitHub job lists (2027 cycle).

Each repo uses a slightly different markdown table layout, so instead of hard-coding column
positions we locate the "Company" / "Role" / "Location" / "Apply" / "Posted" columns from each
table's header row. Tables without a Company+Role header (e.g. per-company summary tables) are
skipped automatically.
"""
import html
import re
import sys
import requests
from scrapers.base_scraper import role_matches, is_internship, extract_link, _strip_html

_RAW = "https://raw.githubusercontent.com/"

# (label, raw url, extra) -- internships
INTERNSHIP_SOURCES = [
    ("canada-michelleokolie", _RAW + "michelleokolie/canada-tech-internships-summer-2027/add-internship-bot/README.md", None),
    ("canada-zapply", _RAW + "zapplyjobs/Canada-Internships-2027/main/README.md", None),
    ("canada-bobwillrule", _RAW + "Bobwillrule/Canadian-Internship-List/main/README.md", None),
    ("canada-francklin", _RAW + "Francklin9999/canada-internship/master/INTERNSHIPS.md", None),
    ("zapply-ml", _RAW + "zapplyjobs/awesome-ml-internships-2027/main/README.md", None),
    # Aggregated tracker: only keep rows whose "Terms" column mentions 2027
    ("tracker2027-ai", _RAW + "SuryaHarikrishnan/2027-internship-tracker/master/listings/data-science-ai-machine-learning.md", "2027"),
    ("tracker2027-swe", _RAW + "SuryaHarikrishnan/2027-internship-tracker/master/listings/software-engineering.md", "2027"),
    ("tracker2027-quant", _RAW + "SuryaHarikrishnan/2027-internship-tracker/master/listings/quantitative-finance.md", "2027"),
]

NEWGRAD_SOURCES = [
    ("zapply-newgrad", _RAW + "zapplyjobs/New-Grad-Software-Engineering-Jobs-2027/main/README.md", None),
    ("devsunite-newgrad", _RAW + "devsuniteofficial/new-grad-tech-jobs/main/README.md", None),
    ("canada-francklin-newgrad", _RAW + "Francklin9999/canada-internship/master/NEW_GRAD.md", None),
]

_HEADER_ALIASES = {
    "company": ("company",),
    "title": ("role", "position", "title"),
    "location": ("location", "locations"),
    "apply": ("apply", "application", "application/link", "link", "application link"),
    "posted": ("posted", "date posted", "date"),
    "terms": ("terms", "term"),
}


def _norm_header(cell: str) -> str:
    return re.sub(r"[*_`]", "", cell).strip().lower()


def _map_header(cells):
    """Return {field: index} if this row is a Company+Role header, else None."""
    names = [_norm_header(c) for c in cells]
    mapping = {}
    for field, aliases in _HEADER_ALIASES.items():
        for i, n in enumerate(names):
            if n in aliases or (field == "apply" and n.startswith("apply")):
                mapping.setdefault(field, i)
                break
    # Some lists (the 2027 tracker) have no Apply column; the link lives in the Company cell.
    if "company" in mapping and "title" in mapping and ("apply" in mapping or "terms" in mapping):
        return mapping
    return None


def _clean_company(raw: str) -> str:
    # [Name](url) -> Name, then strip html / bold markers
    raw = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", raw)
    return re.sub(r"[*_]", "", _strip_html(raw)).strip()


def _clean_title(raw: str) -> str:
    raw = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", raw)
    t = html.unescape(_strip_html(raw))
    t = re.sub(r"^\s*NEW\s+|\s+NEW\s*$", "", t)  # "NEW" badge before/after the title
    return re.sub(r"\s+", " ", t).strip()


def _clean_date(raw: str) -> str:
    raw = re.split(r"<br\s*/?>", raw, maxsplit=1)[0]
    return _strip_html(raw)


def parse_list_markdown(text: str, label: str, is_newgrad: bool = False, terms_filter=None):
    """Parse every Company/Role table in `text` into (uid, title, company, location, url, date)."""
    results = []
    mapping = None
    last_company = ""

    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]

        header = _map_header(cells)
        if header is not None:
            mapping, last_company = header, ""
            continue
        if mapping is None or set("".join(cells)) <= set("-: "):
            continue
        if len(cells) <= max(mapping.values()):
            continue

        def col(field):
            i = mapping.get(field)
            return cells[i] if i is not None else ""

        company_raw = col("company")
        if company_raw.strip() == "↳":
            company = last_company
        else:
            company = _clean_company(company_raw)
            last_company = company
        title = _clean_title(col("title"))
        if not company or not title:
            continue

        if terms_filter and terms_filter not in col("terms"):
            continue
        if not role_matches(title):
            continue
        # Internship boards keep only intern/co-op roles; new grad boards drop them
        if is_newgrad == is_internship(title):
            continue

        url = html.unescape(extract_link(col("apply") or company_raw))
        if not url:
            continue
        location = _strip_html(col("location")) or "Unknown"
        date_posted = _clean_date(col("posted"))

        uid = f"{label}:{company}:{title}:{url}"
        results.append((uid, title, company, location, url, date_posted))
    return results


def _fetch_sources(sources, is_newgrad: bool):
    all_jobs = []
    for label, url, terms_filter in sources:
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
        except Exception as exc:
            print(f"[{label}] WARN: {exc}", file=sys.stderr)
            continue
        all_jobs.extend(parse_list_markdown(resp.text, label, is_newgrad, terms_filter))
    return all_jobs


def fetch_community_internship_jobs():
    """Canada 2027 lists, zapply ML, and the 2027 multi-category tracker."""
    return _fetch_sources(INTERNSHIP_SOURCES, is_newgrad=False)


def fetch_community_newgrad_jobs():
    """Zapply, DevsUnite and Francklin new grad lists."""
    return _fetch_sources(NEWGRAD_SOURCES, is_newgrad=True)
