import sys
import requests
import db
from scrapers.base_scraper import classify_country, generate_dedup_keys

BATCH_SIZE = 15

def format_job_message(source_label: str, title: str, company: str, location: str, url: str) -> str:
    """Format a job posting with company first, then title, location, and source."""
    apply_link = f"<{url}|Apply>" if url else "No link"
    return (
        f"🏢 *{company}* — {title} — 📍 {location}\n"
        f"   🔗 {apply_link}\n"
        f"   📋 _Source: {source_label}_"
    )

def match_job_filters(job: tuple, filters: dict) -> bool:
    """
    Returns True if the job matches the user filters, False otherwise.
    job: (source_label, title, company, location, url)
    filters: dict containing keywords, countries, roles, min_grad_year
    """
    source_label, title, company, location, url = job
    
    # 1. Country match
    countries = filters.get("countries", [])
    if countries:
        job_country = classify_country(location)
        # If job matches both, it matches if user has either 'canada' or 'usa'
        matched_country = False
        for c in countries:
            c_lower = c.lower()
            if c_lower == "canada" and job_country in ("canada", "both"):
                matched_country = True
            elif c_lower == "usa" and job_country in ("usa", "both"):
                matched_country = True
            elif c_lower == "both" and job_country == "both":
                matched_country = True
            elif c_lower == "other" and job_country == "other":
                matched_country = True
        
        if not matched_country:
            return False
            
    # 2. Keywords match (checks title and company, case-insensitive)
    keywords = filters.get("keywords", [])
    if keywords:
        text_to_search = f"{title} {company}".lower()
        if not any(k.lower() in text_to_search for k in keywords):
            return False
            
    # 3. Roles match (checks title, case-insensitive)
    roles = filters.get("roles", [])
    if roles:
        title_lower = title.lower()
        if not any(r.lower() in title_lower for r in roles):
            return False
            
    return True

def notify_users(new_jobs: list) -> None:
    """
    Sends new jobs to all matching users using their custom filters and webhook URLs.
    new_jobs: list of (source_label, title, company, location, url) tuples.
    """
    if not new_jobs:
        print("No new jobs to notify.", flush=True)
        return

    # Deduplicate input new_jobs list
    unique_new_jobs = []
    seen_keys = set()
    for job in new_jobs:
        label, title, company, location, url = job[:5]
        keys = generate_dedup_keys(company, title, location, url)
        if any(k in seen_keys for k in keys):
            continue
        for k in keys:
            seen_keys.add(k)
        unique_new_jobs.append(job)

    new_jobs = unique_new_jobs

    users = db.get_active_users()
    if not users:
        print("No registered users found in the database. Notifications will be printed to stdout.", flush=True)
        for label, title, company, location, url in new_jobs:
            print(f"[TESTING FAN-OUT] {company} - {title} ({location}) via {label}")
        return

    for user in users:
        email = user.get("email") or "Unknown User"
        webhook_url = user.get("webhook_url")
        platform = (user.get("platform") or "slack").lower()
        
        if not webhook_url:
            print(f"Warning: Webhook URL is empty for {email}, skipping.", file=sys.stderr)
            continue

        filters = user.get("user_filters") or {}
        user_jobs = [job for job in new_jobs if match_job_filters(job, filters)]
        
        if not user_jobs:
            continue

        print(f"Sending {len(user_jobs)} job(s) to user {email} via {platform}...", flush=True)

        # Chunk jobs into batches to stay well within Slack/Discord character & payload limits
        for i in range(0, len(user_jobs), BATCH_SIZE):
            chunk = user_jobs[i : i + BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            total_batches = (len(user_jobs) + BATCH_SIZE - 1) // BATCH_SIZE

            if platform == "slack":
                header = f":bell: *{len(user_jobs)} new job(s) found!* (Batch {batch_num}/{total_batches})\n\n"
                lines = [format_job_message(*job) for job in chunk]
                payload = {"text": header + "\n\n".join(lines)}
            elif platform == "discord" or "discord.com" in webhook_url:
                header = f"🔔 **{len(user_jobs)} new job(s) found!** (Batch {batch_num}/{total_batches})\n\n"
                discord_lines = []
                for job in chunk:
                    label, title, company, location, url = job
                    apply_link = f"[{company} Apply]({url})" if url else "No link"
                    discord_lines.append(f"🏢 **{company}** — {title} — 📍 {location}\n   🔗 {apply_link}\n   📋 *Source: {label}*")
                payload = {"content": header + "\n\n".join(discord_lines)}
            else:
                header = f"*{len(user_jobs)} new job(s) found!* (Batch {batch_num}/{total_batches})\n\n"
                lines = [format_job_message(*job) for job in chunk]
                payload = {"text": header + "\n\n".join(lines)}

            try:
                resp = requests.post(webhook_url, json=payload, timeout=15)
                resp.raise_for_status()
                print(f"Successfully sent batch {batch_num}/{total_batches} to {email}.", flush=True)
            except Exception as exc:
                print(f"ERROR: Failed to send batch {batch_num}/{total_batches} to {email}: {exc}", file=sys.stderr)

