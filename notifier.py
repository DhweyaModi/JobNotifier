import sys
import requests
import db
from scrapers.base_scraper import classify_country

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

    users = db.get_active_users()
    if not users:
        print("No registered users found in the database. Notifications will be printed to stdout.", flush=True)
        # Fallback to local console printing for testing/admin setup
        for label, title, company, location, url in new_jobs:
            print(f"[TESTING FAN-OUT] {company} - {title} ({location}) via {label}")
        return

    # Loop over users and fan-out
    for user in users:
        email = user.get("email") or "Unknown User"
        webhook_url = user.get("webhook_url")
        platform = (user.get("platform") or "slack").lower()
        
        # Extract filters
        filters = user.get("user_filters") or {}
        
        # Filter jobs for this specific user
        user_jobs = [job for job in new_jobs if match_job_filters(job, filters)]
        
        if not user_jobs:
            continue

        print(f"Sending {len(user_jobs)} job(s) to user {email} via {platform}...", flush=True)
        
        # Format message based on platform
        lines = [format_job_message(*job) for job in user_jobs]
        
        # Slack vs Discord shapes
        if platform == "slack":
            header = f":bell: *{len(user_jobs)} new job(s) found matching your filters!*\n\n"
            message_body = header + "\n\n".join(lines)
            payload = {"text": message_body}
        elif platform == "discord" or "discord.com" in webhook_url:
            # Discord doesn't natively support slack <url|text> formatting, we replace it with standard markdown [text](url)
            discord_lines = []
            for job in user_jobs:
                label, title, company, location, url = job
                apply_link = f"[{company} Apply]({url})" if url else "No link"
                discord_lines.append(f"🏢 **{company}** — {title} — 📍 {location}\n   🔗 {apply_link}\n   📋 *Source: {label}*")
            header = f"🔔 **{len(user_jobs)} new job(s) found matching your filters!**\n\n"
            message_body = header + "\n\n".join(discord_lines)
            payload = {"content": message_body}
        else:
            # Fallback to Slack structure
            header = f"*{len(user_jobs)} new job(s) found!*\n\n"
            message_body = header + "\n\n".join(lines)
            payload = {"text": message_body}

        # Try-catch per user for failure isolation
        try:
            if not webhook_url:
                print(f"Warning: Webhook URL is empty for {email}, skipping.", file=sys.stderr)
                continue
                
            resp = requests.post(webhook_url, json=payload, timeout=15)
            resp.raise_for_status()
            print(f"Successfully notified user {email}.", flush=True)
        except Exception as exc:
            print(f"ERROR: Failed to send notification to user {email}: {exc}", file=sys.stderr)
