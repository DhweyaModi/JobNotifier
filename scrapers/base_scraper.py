import re

# --- Shared Filters --------------------------------------------------------

ROLE_KEYWORDS = [
    "software", "swe", "engineer", "engineering", "developer", "data",
    "machine learning", "ml", "ai", "backend", "frontend", "full stack",
    "full-stack", "scientist", "research", "researcher", "quant", "quantitative",
    "trader", "analyst", "architect", "systems", "system", "infrastructure",
    "sre", "devops", "robotics", "security", "cyber", "cloud", "embedded",
    "firmware", "hardware", "mobile", "ios", "android", "tpm",
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

US_CITIES = {
    "nyc", "sf", "bay area", "silicon valley", "new york city", "new york",
    "seattle", "austin", "san francisco", "san jose", "los angeles", "chicago",
    "boston", "atlanta", "denver", "dallas", "houston", "san diego", "phoenix",
    "pittsburgh", "raleigh", "redmond", "cupertino", "mountain view", "palo alto",
    "menlo park", "sunnyvale", "bellevue", "culver city"
}

USA_NAME_HINTS = ["usa", "united states", "u.s.", "u.s.a", "us"]

CA_PROVINCES = {
    "ab", "alberta", "bc", "british columbia", "mb", "manitoba",
    "nb", "new brunswick", "nl", "newfoundland", "ns", "nova scotia",
    "nt", "northwest territories", "nu", "nunavut", "on", "ontario",
    "pe", "prince edward island", "qc", "quebec", "sk", "saskatchewan",
    "yt", "yukon",
}

CA_CITIES = {
    "toronto", "vancouver", "montreal", "waterloo", "ottawa", "calgary",
    "edmonton", "quebec city", "winnipeg", "halifax", "victoria", "mississauga",
    "brampton", "hamilton", "kitchener", "burnaby", "surrey",
    "markham", "richmond", "laval", "gatineau", "sherbrooke", "saskatoon",
    "regina", "st. john's", "st johns", "guelph", "windsor", "oakville",
    "burlington", "richmond hill", "vaughan", "kanata"
}

CANADA_NAME_HINTS = ["canada", "canadian"]


def role_matches(title_text: str) -> bool:
    title = title_text.lower()
    for kw in ROLE_KEYWORDS:
        pattern = r"\b" + re.escape(kw) + r"\b"
        if re.search(pattern, title):
            return True
    return False


def is_internship(title_text: str) -> bool:
    title = title_text.lower()
    return any(k in title for k in INTERNSHIP_KEYWORDS)


def _clean_location(location_text: str) -> str:
    """Strip out HTML tags and common non-geographic modifier words/phrases."""
    text = re.sub(r"<[^>]+>", " ", location_text)
    text = text.lower()
    noise_patterns = [
        r"\bin[- ]office\b",
        r"\bin[- ]person\b",
        r"\bin[- ]site\b",
        r"\bon[- ]site\b",
        r"\bon[- ]location\b",
        r"\bonsite\b",
        r"\boffsite\b",
        r"\bco[- ]?op\b",
        r"\bcoop\b",
        r"\bremote in\b",
        r"\blocated in\b",
        r"\bhybrid in\b",
        r"\boffice in\b",
        r"\bbased in\b",
        r"\bor remote\b",
        r"\bor hybrid\b",
        r"\bor onsite\b",
        r"\bor in-person\b",
        r"\bor in-office\b",
        r"\bor in person\b",
        r"\bor in office\b",
        r"\b or \b",
    ]
    for pat in noise_patterns:
        text = re.sub(pat, " ", text)
    return text


def _tokenize_location(location_text: str) -> list:
    cleaned = _clean_location(location_text)
    parts = re.split(r"[,/()\+\s]+", cleaned)
    return [p.strip() for p in parts if p.strip()]


def classify_country(location_text: str) -> str:
    """Returns 'canada', 'usa', 'both', or 'other' based on location text."""
    if not location_text:
        return "other"

    loc_lower = _clean_location(location_text)
    tokens = _tokenize_location(location_text)
    token_set = set(tokens)

    # Check explicit Canada indicators
    has_ca_province = bool(token_set & CA_PROVINCES)
    has_ca_country = bool(re.search(r"\bcanada\b", loc_lower)) or (
        bool(re.search(r"\bcanadian\b", loc_lower)) and "canadian county" not in loc_lower
    )
    ca_city_matches = {c for c in CA_CITIES if re.search(r"\b" + re.escape(c) + r"\b", loc_lower)}
    has_ca_city = bool(ca_city_matches)

    # Check explicit US indicators
    has_us_state = bool(token_set & US_STATES)
    has_us_country = any(re.search(r"\b" + re.escape(h) + r"\b", loc_lower) for h in USA_NAME_HINTS)
    us_city_matches = {c for c in US_CITIES if re.search(r"\b" + re.escape(c) + r"\b", loc_lower)}
    has_us_city = bool(us_city_matches)

    # Determine Canada (explicit province/country tag, OR CA city without conflicting US state/country tags)
    is_canada = has_ca_province or has_ca_country or (has_ca_city and not (has_us_state or has_us_country))

    # Determine USA (explicit state, country, or city tag)
    is_usa = has_us_state or has_us_country or has_us_city

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


def parse_job_date(date_val, current_year=2026):
    """Converts raw date values into (unix_timestamp, human_display_string)."""
    from datetime import datetime, timedelta, timezone
    if not date_val:
        return 0, ""

    if isinstance(date_val, (int, float)):
        try:
            dt = datetime.fromtimestamp(date_val, tz=timezone.utc)
            return int(date_val), dt.strftime("%b %d, %Y")
        except Exception:
            return 0, ""

    s = str(date_val).strip()
    if not s or s.lower() in ("-", "age", "added", "date", "n/a", "posting"):
        return 0, ""

    now = datetime.now(timezone.utc)

    # Relative age (e.g. 0d, 1d, 2d, 12h, 30m)
    m_rel = re.match(r"^(\d+)\s*([dhm])$", s, re.IGNORECASE)
    if m_rel:
        num = int(m_rel.group(1))
        unit = m_rel.group(2).lower()
        if unit == "d":
            dt = now - timedelta(days=num)
        elif unit == "h":
            dt = now - timedelta(hours=num)
        elif unit == "m":
            dt = now - timedelta(minutes=num)
        else:
            dt = now
        ts = int(dt.timestamp())
        return ts, f"{num}{unit} ago" if num > 0 else "Just now"

    # Format YYYY-MM-DD
    m_iso = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", s)
    if m_iso:
        dt = datetime(int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3)), tzinfo=timezone.utc)
        ts = int(dt.timestamp())
        diff_hours = int((now - dt).total_seconds() / 3600)
        if 0 <= diff_hours < 24:
            return ts, f"{max(1, diff_hours)}h ago"
        return ts, dt.strftime("%b %d, %Y")

    # Format Aug 4, 2026 or Aug 05
    for fmt in ("%b %d, %Y", "%b %d %Y", "%B %d, %Y", "%b %d", "%B %d"):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.year == 1900:
                dt = dt.replace(year=current_year)
                dt_utc = dt.replace(tzinfo=timezone.utc)
                if dt_utc > now:
                    dt = dt.replace(year=current_year - 1)
            dt = dt.replace(tzinfo=timezone.utc)
            ts = int(dt.timestamp())
            diff_hours = int((now - dt).total_seconds() / 3600)
            if 0 <= diff_hours < 24:
                return ts, f"{max(1, diff_hours)}h ago"
            return ts, dt.strftime("%b %d, %Y")
        except ValueError:
            pass

    return 0, s


# --- Deduplication Helpers -------------------------------------------------

def normalize_company(company: str) -> str:
    """Canonical normalization for company names to prevent duplicates with differing corporate suffixes or casing."""
    if not company:
        return ""
    c = re.sub(r"<[^>]+>", "", company).lower()
    c = re.sub(r"[\(\[\{].*?[\)\]\}]", "", c)
    # Remove common corporate suffixes and noise words
    suffix_pattern = (
        r"\b(inc|llc|ltd|corp|corporation|co|technologies|technology|"
        r"labs|group|platforms|solutions|interactive|software|systems|enterprises)\b\.?"
    )
    c = re.sub(suffix_pattern, " ", c)
    c = re.sub(r"[^a-z0-9]+", " ", c).strip()
    return re.sub(r"\s+", " ", c)


def normalize_title(title: str) -> str:
    """Canonical normalization for job titles to recognize identical roles across different phrasing."""
    if not title:
        return ""
    t = re.sub(r"<[^>]+>", "", title).lower()
    t = re.sub(r"[\(\[\{].*?[\)\]\}]", "", t)

    # Standardize abbreviations
    t = re.sub(r"\bswe\b", "software engineer", t)
    t = re.sub(r"\bml\b", "machine learning", t)
    t = re.sub(r"\bai\b", "artificial intelligence", t)

    # Stem / standardize role keywords
    t = re.sub(r"\b(engineering|developer|developers|dev)\b", "engineer", t)
    t = re.sub(r"\b(scientists|science)\b", "scientist", t)
    t = re.sub(r"\b(analysts|analytics)\b", "analyst", t)

    # Strip seasonality, years, internship qualifiers, locations, and noise words
    noise_patterns = [
        r"\bsummer\b", r"\bfall\b", r"\bwinter\b", r"\bspring\b",
        r"\b202[0-9]\b", r"\b203[0-9]\b",
        r"\binternship\b", r"\bintern\b", r"\bco-?op\b", r"\bcoop\b",
        r"\bhybrid\b", r"\bremote\b", r"\bin-?person\b", r"\bin-?office\b", r"\bonsite\b",
        r"\bnew grad\b", r"\bentry level\b", r"\bearly career\b",
        r"\busa?\b", r"\bcanada\b", r"\bstudent\b", r"\bundergrad(uate)?\b",
        r"\bposition\b", r"\brole\b", r"\bjob\b",
    ]
    for p in noise_patterns:
        t = re.sub(p, " ", t)

    t = re.sub(r"[^a-z0-9]+", " ", t).strip()
    return re.sub(r"\s+", " ", t)


def normalize_url(url: str) -> str:
    """Canonical normalization of application URLs, removing tracking params and protocol differences."""
    if not url or url == "#":
        return ""
    from urllib.parse import urlparse, parse_qs, urlencode
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        path = parsed.path.rstrip("/")
        # Filter tracking query parameters
        query_params = parse_qs(parsed.query)
        cleaned_params = {
            k: v for k, v in query_params.items()
            if not k.lower().startswith("utm_") and k.lower() not in [
                "gh_src", "ref", "source", "lever-source", "mode", "sid", "jid"
            ]
        }
        query_str = urlencode(cleaned_params, doseq=True)
        return f"{netloc}{path}" + (f"?{query_str}" if query_str else "")
    except Exception:
        return url.strip().lower()


def generate_dedup_keys(company: str, title: str, country: str = "", url: str = "") -> list[str]:
    """
    Generates a prioritized list of deduplication keys for a job posting.
    Any match across these keys indicates the job is identical.
    """
    keys = []
    norm_comp = normalize_company(company)
    norm_tit = normalize_title(title)
    norm_c = (country or "").lower().strip()
    norm_u = normalize_url(url)

    # 1. URL key (if direct link is available)
    if norm_u:
        keys.append(f"url:{norm_u}")

    # 2. Company + Title + Country key
    if norm_comp and norm_tit:
        if norm_c and norm_c != "other":
            keys.append(f"role:{norm_comp}:{norm_tit}:{norm_c}")
        # 3. Company + Title key (cross-country / general)
        keys.append(f"role:{norm_comp}:{norm_tit}")

    return keys



