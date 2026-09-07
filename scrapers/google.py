import re
import sys
import json
import html as html_lib
import requests
from scrapers.base_scraper import role_matches, is_internship

URLS = [
    "https://www.google.com/about/careers/applications/jobs/results?target_level=INTERN_AND_APPRENTICE",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
}


def _extract_from_callbacks(html_text):
    """
    Parses Google's AF_initDataCallback payload embedded in server-rendered script tags.
    Extracts all job listings, IDs, titles, and locations.
    """
    jobs = []
    
    # 1. Regex search for job records: ["job_id", "Title", ...] or ["jobs/results/job_id", "Title"]
    # Google IDs are 15-20 digit numeric strings like "123456789012345678" or "jobs/results/..."
    id_title_pattern = re.findall(
        r'\["(\d{14,25})",\s*"([^"]+)"',
        html_text
    )
    for job_id, title in id_title_pattern:
        clean_title = html_lib.unescape(title).strip()
        if len(clean_title) > 3 and not clean_title.isdigit():
            jobs.append({
                "id": job_id,
                "title": clean_title,
                "location": "Multiple Locations",
                "url": f"https://www.google.com/about/careers/applications/jobs/results/{job_id}",
            })

    # 2. Extract full JSON arrays from data: [...] or data:function(){return [...]}
    data_blobs = re.findall(r'data:\s*(?:function\(\)\s*{\s*return\s*)?(\[.*?\])\s*(?:;\s*})?\s*,\s*sideChannel', html_text, re.DOTALL)
    for raw_json in data_blobs:
        try:
            parsed = json.loads(raw_json)
            
            def walk(item):
                if isinstance(item, list):
                    # Check if this item is a job entry
                    # Google format: [job_id, title, company, [locations], ...]
                    if len(item) >= 2 and isinstance(item[0], str) and re.match(r"^\d{14,25}$", item[0]) and isinstance(item[1], str):
                        j_id = item[0]
                        j_title = html_lib.unescape(item[1]).strip()
                        
                        # Find locations in sub-arrays
                        locs = []
                        for elem in item:
                            if isinstance(elem, list):
                                for sub in elem:
                                    if isinstance(sub, str) and ("," in sub or any(c in sub.lower() for c in ["canada", "usa", "united states", "waterloo", "toronto", "seattle", "ca", "ny", "wa"])):
                                        locs.append(sub)
                                    elif isinstance(sub, list):
                                        for ssub in sub:
                                            if isinstance(ssub, str) and ("," in ssub or "united states" in ssub.lower() or "canada" in ssub.lower()):
                                                locs.append(ssub)

                        loc_str = ", ".join(list(set(locs))) if locs else "Multiple Locations"
                        jobs.append({
                            "id": j_id,
                            "title": j_title,
                            "location": loc_str,
                            "url": f"https://www.google.com/about/careers/applications/jobs/results/{j_id}",
                        })
                    for sub in item:
                        walk(sub)
                elif isinstance(item, dict):
                    for v in item.values():
                        walk(v)

            walk(parsed)
        except Exception:
            pass

    return jobs


def fetch_google_jobs():
    """
    Fetches student and software engineering internship postings from Google Careers.
    Returns a list of (unique_id, title, company, location, url, date_posted) tuples.
    """
    results = []
    seen_ids = set()

    for url in URLS:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=25)
            if resp.status_code != 200:
                print(f"Warning: Google Careers page returned HTTP {resp.status_code}", file=sys.stderr)
                continue

            html_text = resp.text
            raw_jobs = _extract_from_callbacks(html_text)

            for item in raw_jobs:
                job_id = str(item.get("id") or "").strip()
                title = str(item.get("title") or "").strip()

                if not job_id or not title or job_id in seen_ids:
                    continue

                # Filters: exclude corporate staff/management or non-intern career programs
                title_lower = title.lower()
                if any(ex in title_lower for ex in ["greach", "talent engagement", "recruiter", "director", "career opportunities"]):
                    continue

                if "manager" in title_lower and not is_internship(title):
                    continue

                # Must be an internship or student role (including PhD / BS / MS)
                is_student_role = is_internship(title) or any(
                    k in title_lower for k in ["student researcher", "step intern", "phd intern", "bs/ms intern", "apprentice"]
                )
                if not is_student_role:
                    continue

                # Must match technical role keywords (software, systems, ai, research, etc.)
                if not role_matches(title):
                    continue

                company = "Google"
                loc = item.get("location") or "Multiple Locations"
                apply_url = item.get("url") or f"https://www.google.com/about/careers/applications/jobs/results/{job_id}"
                uid = f"google:{job_id}"

                seen_ids.add(job_id)
                results.append((uid, title, company, loc, apply_url, ""))

        except Exception as e:
            print(f"Warning: Error fetching Google jobs from {url}: {e}", file=sys.stderr)

    return results
