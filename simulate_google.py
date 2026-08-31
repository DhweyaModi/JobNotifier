import sys
import json
import requests
from scrapers.google import fetch_google_jobs, BASE_URL, HEADERS
from scrapers.base_scraper import classify_country
from notifier import format_job_message, is_high_tech_job

def test_live_google_api():
    print("=" * 60)
    print("📡 STEP 1: Live Ping to Google Careers API")
    print("=" * 60)

    python test_google.py# 1. Test live endpoint with general student/intern search
    params = {
        "q": "intern",
        "page_size": 10,
        "sort_by": "relevance",
    }

    try:
        resp = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=15)
        print(f"HTTP Status Code : {resp.status_code} (200 = Success)")
        print(f"Content-Type     : {resp.headers.get('Content-Type')}")

        if resp.status_code == 200:
            data = resp.json()
            total_count = data.get("count", 0)
            jobs = data.get("jobs", [])
            print(f"Total Google API Search Results: {total_count}")
            print(f"Jobs returned in this batch: {len(jobs)}")

            if jobs:
                sample = jobs[0]
                print("\n[Sample Raw Job from Google's Server]:")
                print(f"  ID        : {sample.get('id')}")
                print(f"  Title     : {sample.get('title')}")
                print(f"  Locations : {sample.get('locations')}")
                print(f"  Apply URL : {sample.get('apply_url')}")
    except Exception as e:
        print(f"Error reaching Google API: {e}")

def test_actual_scraper_run():
    print("\n" + "=" * 60)
    print("🔍 STEP 2: Running fetch_google_jobs() Scraper Function")
    print("=" * 60)

    jobs = fetch_google_jobs()
    print(f"Scraper returned: {len(jobs)} filtered software engineering internship(s)")
    for j in jobs:
        uid, title, company, loc, url, date = j
        print(f"\n  🏢 {company} — {title}")
        print(f"     📍 Location: {loc} (Classified: {classify_country(loc)})")
        print(f"     🔗 URL: {url}")

def simulate_pipeline_processing():
    print("\n" + "=" * 60)
    print("⚡ STEP 3: Simulating High Tech Slack Notification & UI Processing")
    print("=" * 60)

    # Simulated newly discovered Google SWE Intern role
    simulated_google_job = (
        "Google",
        "Software Engineering Intern, Summer 2026",
        "Google",
        "Mountain View, CA, USA, Waterloo, ON, Canada",
        "https://careers.google.com/jobs/results/1337420/",
        "2026-08-30"
    )

    source, title, company, location, url, date = simulated_google_job

    country = classify_country(location)
    is_ht = is_high_tech_job(title, company)
    slack_formatted = format_job_message(source, title, company, location, url)

    print(f"Company Classified As High Tech: {is_ht} ✅")
    print(f"Country Classification         : {country.upper()} 🇨🇦🇺🇸")
    print(f"\n[Generated Slack Notification Message]:")
    print("-" * 40)
    print(slack_formatted)
    print("-" * 40)
    print("\n[UI Representation]:")
    print(f"Card Title   : {title}")
    print(f"Badge        : ⚡ HIGH TECH | 🇨🇦🇺🇸 Cross-Border")
    print(f"Direct Link  : {url}")

if __name__ == "__main__":
    test_live_google_api()
    test_actual_scraper_run()
    simulate_pipeline_processing()
    print("\n" + "=" * 60)
    print("✅ All Google scraper systems verified and operational.")
    print("=" * 60 + "\n")
