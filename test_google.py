import re
import sys
import json
import requests
from scrapers.google import URLS, HEADERS, fetch_google_jobs

def diagnose_google():
    print("=" * 60)
    print("🔍 DIAGNOSTIC: Inspecting Google Careers HTML Structure")
    print("=" * 60)
    
    url = URLS[0]
    print(f"URL: {url}")
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        print(f"Status Code: {r.status_code}")
        print(f"HTML Size  : {len(r.text)} bytes\n")
        
        html = r.text
        
        # 1. Search for keywords
        print("--- Keyword Matches in HTML ---")
        for kw in ["Software", "Intern", "Student", "Engineer", "University", "Bachelor"]:
            cnt = len(re.findall(re.escape(kw), html, re.IGNORECASE))
            print(f"  '{kw}': {cnt} times")

        # 2. Check for script tags
        print("\n--- Script Tag Analysis ---")
        script_tags = re.findall(r'<script([^>]*)>(.*?)</script>', html, re.DOTALL)
        print(f"Total <script> tags: {len(script_tags)}")
        
        # Check for JSON-LD
        json_lds = re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.DOTALL)
        print(f"JSON-LD blocks found: {len(json_lds)}")
        for idx, jld in enumerate(json_lds):
            print(f"  [JSON-LD #{idx+1}]: {jld[:200]}...")

        # Check for AF_initDataCallback or data arrays
        callbacks = re.findall(r'AF_initDataCallback\s*\(\s*({.*?})\s*\)\s*;', html, re.DOTALL)
        print(f"AF_initDataCallback blocks: {len(callbacks)}")

        # Check for job URLs
        job_links = re.findall(r'href=["\'](/about/careers/applications/jobs/results/\d+[^"\']*)["\']', html)
        print(f"Job Links found: {len(set(job_links))} -> {list(set(job_links))[:5]}")

        # Check for titles in headings
        headings = re.findall(r'<h[23][^>]*>(.*?)</h[23]>', html, re.DOTALL)
        clean_headings = [re.sub(r'<[^>]+>', '', h).strip() for h in headings if len(h.strip()) > 3]
        print(f"Headings (h2/h3): {clean_headings[:5]}")

    except Exception as e:
        print(f"Error: {e}")

def main():
    diagnose_google()
    print("\n" + "=" * 60)
    print("🔍 Running fetch_google_jobs():")
    print("=" * 60)
    jobs = fetch_google_jobs()
    print(f"✅ Extracted {len(jobs)} Google internship(s):\n")
    for j in jobs:
        uid, title, company, loc, url, date = j
        print(f"🏢 {company} — {title}")
        print(f"   📍 Location: {loc}")
        print(f"   🔗 Apply URL: {url}\n")

if __name__ == "__main__":
    main()
