import re

# --- Shared Filters --------------------------------------------------------

ROLE_KEYWORDS = [
    "software", "swe", "engineer", "engineering", "developer", "data",
    "machine learning", "ml", "ai", "backend", "frontend", "full stack",
    "full-stack", "scientist", "research", "researcher", "quant", "quantitative",
    "trader", "analyst", "architect", "systems", "system", "infrastructure",
    "sre", "devops", "robotics", "security", "cyber", "cloud", "embedded",
    "firmware", "hardware", "mobile", "ios", "android", "product", "tpm",
    "programmer", "tech", "technical", "computer", "computing",
]

INTERNSHIP_KEYWORDS = [
    "intern", "internship", "co-op", "coop", "co op",
]

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
CANADA_NAME_HINTS = ["canada"]


def role_matches(title_text: str) -> bool:
    title = title_text.lower()
    return any(k in title for k in ROLE_KEYWORDS)


def is_internship(title_text: str) -> bool:
    title = title_text.lower()
    return any(k in title for k in INTERNSHIP_KEYWORDS)


def _tokenize_location(location_text: str) -> list:
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


# --- Shared HTML/Markdown Parsing Helpers ----------------------------------

def _strip_html(cell: str) -> str:
    """Strip HTML tags (e.g. <a><strong>Company</strong></a>) down to plain text."""
    return re.sub(r"<[^>]+>", "", cell).strip()


def extract_link(cell: str) -> str:
    """Extract actual application URL from a table cell, ignoring badge/image URLs."""
    if not cell:
        return ""
    # 1. Try HTML href attribute: <a href="URL"...>
    m_html = re.search(r'href=["\']([^"\']+)["\']', cell, re.IGNORECASE)
    if m_html:
        url = m_html.group(1).strip()
        if url and not url.startswith("#"):
            return url

    # 2. Try markdown link pattern [text](url)
    md_matches = re.findall(r'\]\((https?://[^\s\)]+)\)', cell)
    if md_matches:
        non_img = [
            u for u in md_matches
            if not re.search(r'\.(png|jpg|jpeg|gif|svg)(\?.*)?$', u, re.I)
            and "shields.io" not in u
            and "imgur.com" not in u
        ]
        if non_img:
            return non_img[-1].strip()
        return md_matches[-1].strip()

    # 3. Fallback: Any http/https link in text that isn't a badge image
    raw_urls = re.findall(r'(https?://[^\s\)\"\>]+)', cell)
    if raw_urls:
        non_img = [
            u for u in raw_urls
            if not re.search(r'\.(png|jpg|jpeg|gif|svg)(\?.*)?$', u, re.I)
            and "shields.io" not in u
            and "imgur.com" not in u
        ]
        if non_img:
            return non_img[0].strip()
        return raw_urls[0].strip()

    return ""


def _extract_href(cell: str) -> str:
    """Legacy helper alias pointing to extract_link."""
    return extract_link(cell)


def _iter_table_rows(text: str, min_cols: int):
    """Yield stripped cell lists for each markdown table row with >= min_cols columns."""
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < min_cols:
            continue
        yield cells


def _is_junk_row(company_raw: str, title: str) -> bool:
    """True for header rows, markdown separator rows (---|---|...), etc."""
    if title.lower() in ("role", "position") or set(title) <= {"-", " ", ":"}:
        return True
    if set(company_raw) <= {"-", " ", ":"}:
        return True
    return False

