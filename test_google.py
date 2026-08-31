import sys
from scrapers.google import fetch_google_jobs

def main():
    print("\n🔍 Polling Google Careers API (target_level=INTERN_AND_APPRENTICE)...\n")
    try:
        jobs = fetch_google_jobs()
        print(f"✅ Successfully fetched {len(jobs)} Google internship(s):\n")
        if not jobs:
            print("No active Google internship listings matching filters at this moment.")
        for j in jobs:
            uid, title, company, loc, url, date = j
            print(f"🏢 {company} — {title}")
            print(f"   📍 Location : {loc}")
            print(f"   🔗 Apply URL: {url}\n")
    except Exception as e:
        print(f"❌ Error running Google scraper: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
