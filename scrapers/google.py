import re
import sys
import json
import requests
from scrapers.base_scraper import role_matches, is_internship

SEARCH_URL = (
    "https://www.google.com/about/careers/applications/jobs/results"
    "?target_level=INTERN_AND_APPRENTICE"
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/151.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
}


def _extract_jobs_from_json_blob(blob_data):
    """Recursively traverses parsed JSON blob from Google script tags to find job objects."""
    jobs = []
    
    def traverse(item):
        if isinstance(item, dict):
            # Check if this dict represents a Google job object
            title = item.get("title") or item.get("job_title")
            job_id = item.get("id") or item.get("job_id")
            if title and (job_id or item.get("apply_url")):
                jobs.append(item)
            for v in item.values():
                traverse(v)
        elif isinstance(item, list):
            # Check array structure format: ["job_id", "title", ...]
            if len(item) >= 3 and isinstance(item[0], str) and re.match(r"^\d{6,}$", str(item[0])) and isinstance(item[1], str):
                jobs.append({
                    "id": item[0],
                    "title": item[1],
                    "locations": item[2] if isinstance(item[2], (list, str)) else [],
                })
            for sub in item:
                traverse(sub)

    traverse(blob_data)
    return jobs


def fetch_google_jobs():
    """
    Fetches the Google Careers server-rendered page and extracts embedded job listings.
    Returns a list of (unique_id, title, company, location, url, date_posted) tuples.
    """
    results = []
    seen_ids = set()

    try:
        resp = requests.get(SEARCH_URL, headers=HEADERS, timeout=25)
        if resp.status_code != 200:
            print(f"Warning: Google Careers page returned HTTP {resp.status_code}", file=sys.stderr)
            return results

        html = resp.text

        # 1. Pattern matching for AF_initDataCallback
        # Google commonly uses: AF_initDataCallback({key: 'ds:...', data: [...]});
        callback_matches = re.findall(r"AF_initDataCallback\s*\(\s*({.*?})\s*\)\s*;", html, re.DOTALL)
        for match in callback_matches:
            try:
                # Clean unquoted JS keys if needed
                cleaned = re.sub(r"([{,])\s*([a-zA-Z0-9_]+)\s*:", r'\1"\2":', match)
                cleaned = cleaned.replace("'", '"')
                blob = json.loads(cleaned)
                raw_jobs = _extract_jobs_from_json_blob(blob)
                for rj in raw_jobs:
                    _process_and_add_job(rj, seen_ids, results)
            except Exception:
                # Fallback: Extract array inside data: [...]
                data_match = re.search(r"data:\s*(\[.*?\])\s*,\s*sideChannel", match, re.DOTALL)
                if data_match:
                    try:
                        raw_data = json.loads(data_match.group(1))
                        raw_jobs = _extract_jobs_from_json_blob(raw_data)
                        for rj in raw_jobs:
                            _process_and_add_job(rj, seen_ids, results)
                    except Exception:
                        pass

        # 2. Pattern matching for window.APP_INITIALIZATION_STATE or __INITIAL_STATE__
        state_matches = re.findall(r"(?:window\.APP_INITIALIZATION_STATE|window\.__INITIAL_STATE__)\s*=\s*([\[{].*?[\]}]);", html, re.DOTALL)
        for match in state_matches:
            try:
                blob = json.loads(match)
                raw_jobs = _extract_jobs_from_json_blob(blob)
                for rj in raw_jobs:
                    _process_and_add_job(rj, seen_ids, results)
            except Exception:
                pass

        # 3. HTML Card / Link Regex Fallback
        # Look for links to /about/careers/applications/jobs/results/<job_id>
        job_link_matches = re.findall(
            r'href=["\']/about/careers/applications/jobs/results/(\d+)[^"\']*["\'][^>]*>(.*?)</a>',
            html,
            re.DOTALL | re.IGNORECASE
        )
        for job_id, inner_text in job_link_matches:
            clean_title = re.sub(r"<[^>]+>", " ", inner_text).strip()
            clean_title = re.sub(r"\s+", " ", clean_title)
            if clean_title and len(clean_title) > 3 and job_id not in seen_ids:
                rj = {
                    "id": job_id,
                    "title": clean_title,
                    "locations": ["Multiple Locations"],
                    "apply_url": f"https://www.google.com/about/careers/applications/jobs/results/{job_id}",
                }
                _process_and_add_job(rj, seen_ids, results)

    except Exception as e:
        print(f"Warning: Error in Google HTML scraper: {e}", file=sys.stderr)

    return results


def _process_and_add_job(job_dict, seen_ids, results):
    job_id = str(job_dict.get("id") or "")
    title = str(job_dict.get("title") or "").strip()

    if not job_id or not title or job_id in seen_ids:
        return

    # Check relevance
    title_lower = title.lower()
    is_student_researcher = "student researcher" in title_lower or "step" in title_lower
    if not (role_matches(title) or is_internship(title) or is_student_researcher):
        return

    company = "Google"

    # Locations
    locs = job_dict.get("locations", [])
    if isinstance(locs, list):
        loc_str = ", ".join([str(l) for l in locs if str(l).strip()])
    elif isinstance(locs, str):
        loc_str = locs
    else:
        loc_str = "Multiple Locations"

    if not loc_str:
        loc_str = "Multiple Locations"

    # Apply URL
    url = (
        job_dict.get("apply_url")
        or f"https://www.google.com/about/careers/applications/jobs/results/{job_id}"
    )

    uid = f"google:{job_id}"
    seen_ids.add(job_id)
    results.append((uid, title, company, loc_str, url, ""))
