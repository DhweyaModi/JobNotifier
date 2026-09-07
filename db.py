import os
import sys
import json
from datetime import datetime, timezone
from supabase import create_client, Client
from postgrest.exceptions import APIError
from dotenv import load_dotenv
from scrapers.base_scraper import generate_dedup_keys

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SEEN_JOBS_FILE = "seen_jobs.json"

if not SUPABASE_URL or not SUPABASE_KEY:
    supabase = None
else:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Warning initializing Supabase client: {e}", flush=True)
        supabase = None


def _load_local_seen_jobs() -> set:
    if os.path.exists(SEEN_JOBS_FILE):
        try:
            with open(SEEN_JOBS_FILE, "r") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return set(data)
        except Exception as e:
            print(f"Warning loading {SEEN_JOBS_FILE}: {e}", flush=True)
    return set()


def _save_local_seen_jobs(seen_jobs: set):
    try:
        with open(SEEN_JOBS_FILE, "w") as f:
            json.dump(sorted(list(seen_jobs)), f, indent=2)
    except Exception as e:
        print(f"Warning saving {SEEN_JOBS_FILE}: {e}", flush=True)


def verify_database_health() -> tuple[bool, str]:
    """
    Validates database connectivity and write permissions by inserting and deleting a probe row.
    Returns (True, "OK") if healthy, or (False, error_details) if write access is broken (e.g. RLS).
    """
    global supabase
    if not supabase:
        return True, "Supabase client not configured (operating in local fallback mode)."

    probe_uid = f"__health_probe_{int(datetime.now(timezone.utc).timestamp())}__"
    try:
        # Test write permission
        res = supabase.table("jobs").insert({
            "external_uid": probe_uid,
            "source": "HealthProbe",
            "title": "Health Probe Test",
            "company": "ProbeCo",
            "location": "Remote",
            "country": "other",
            "url": "https://probe.test",
            "is_active": False
        }).execute()

        if not res.data:
            return False, "Probe insert returned empty data without exception."

        # Clean up probe
        supabase.table("jobs").delete().eq("external_uid", probe_uid).execute()
        return True, "Database write access verified successfully."
    except APIError as e:
        if e.code == "42501":
            return False, "Row-Level Security (RLS) is blocking inserts on table 'jobs' (code 42501)."
        return False, f"Supabase APIError during health check [code {e.code}]: {e.message}"
    except Exception as exc:
        return False, f"Unexpected error during health check: {exc}"


def upsert_job(uid: str, source: str, title: str, company: str, location: str, country: str, url: str, posted_timestamp: int = 0, posted_date_str: str = "", job_type: str = "") -> bool:
    """
    Inserts a job into Supabase and local seen_jobs.json fallback with multi-key deduplication.
    Returns True if it is a new unique job, False if already seen across any scraper.
    """
    global supabase
    local_seen = _load_local_seen_jobs()

    if not job_type:
        job_type = "newgrad" if ("newgrad" in source.lower() or "new-grad" in source.lower()) else "internship"

    # 1. Multi-key deduplication check
    dedup_keys = generate_dedup_keys(company, title, country, url, job_type=job_type)
    if uid in local_seen:
        return False
    for k in dedup_keys:
        if k in local_seen:
            return False

    is_new = False
    now_iso = datetime.now(timezone.utc).isoformat()

    # 2. Insert into Supabase if available
    if supabase:
        try:
            payload = {
                "external_uid": uid,
                "source": source,
                "title": title,
                "company": company,
                "location": location,
                "country": country,
                "url": url,
                "first_seen_at": now_iso,
                "is_active": True
            }
            if posted_timestamp > 0:
                try:
                    payload["posted_at"] = datetime.fromtimestamp(posted_timestamp, tz=timezone.utc).isoformat()
                except Exception:
                    pass

            response = supabase.table("jobs").insert(payload).execute()
            
            if response.data and len(response.data) > 0:
                is_new = True
        except APIError as e:
            if e.code == "23505":  # Duplicate key in database
                is_new = False
            else:
                print(f"❌ [Supabase APIError] Failed to insert job '{title}' ({uid}) [code {e.code}]: {e.message}", file=sys.stderr, flush=True)
                is_new = False
        except Exception as exc:
            # If table doesn't have first_seen_at or other error, fallback insert without optional fields
            try:
                response = supabase.table("jobs").insert({
                    "external_uid": uid,
                    "source": source,
                    "title": title,
                    "company": company,
                    "location": location,
                    "country": country,
                    "url": url,
                    "is_active": True
                }).execute()
                if response.data and len(response.data) > 0:
                    is_new = True
            except APIError as sub_e:
                if sub_e.code == "23505":
                    is_new = False
                else:
                    print(f"❌ [Supabase APIError] {uid} [code {sub_e.code}]: {sub_e.message}", file=sys.stderr, flush=True)
                    is_new = False
            except Exception as sub_exc:
                print(f"❌ [Supabase Error] {uid}: {sub_exc}", file=sys.stderr, flush=True)
                is_new = False
    else:
        is_new = True

    # 3. If new, register all dedup keys in seen_jobs.json
    if is_new:
        local_seen.add(uid)
        for k in dedup_keys:
            local_seen.add(k)
        _save_local_seen_jobs(local_seen)

    return is_new


def batch_upsert_jobs(jobs: list[dict], default_job_type: str = "") -> int:
    """
    High-performance batch upsert for scraping large sets of jobs into Supabase and seen_jobs.json.
    Deduplicates intra-batch and against seen_jobs.json, batch-inserts into Supabase in chunks of 200,
    and saves updated seen_jobs.json once at the end.
    Returns the count of new jobs inserted.
    """
    global supabase
    local_seen = _load_local_seen_jobs()
    now_iso = datetime.now(timezone.utc).isoformat()

    to_insert = []
    seen_in_batch = set()

    for j in jobs:
        uid = j.get("external_uid") or j.get("uid") or j.get("id")
        source = j.get("source", "Scraper")
        title = j.get("title", "")
        company = j.get("company", "")
        location = j.get("location", "")
        country = j.get("country", "other")
        url = j.get("url", "")
        posted_ts = j.get("posted_timestamp", 0)

        job_type = j.get("job_type") or default_job_type
        if not job_type:
            job_type = "newgrad" if ("newgrad" in source.lower() or "new-grad" in source.lower()) else "internship"

        dedup_keys = generate_dedup_keys(company, title, country, url, job_type=job_type)

        if uid in local_seen or uid in seen_in_batch:
            continue
        if any(k in local_seen or k in seen_in_batch for k in dedup_keys):
            continue

        seen_in_batch.add(uid)
        for k in dedup_keys:
            seen_in_batch.add(k)

        row = {
            "external_uid": uid,
            "source": source,
            "title": title,
            "company": company,
            "location": location,
            "country": country,
            "url": url,
            "first_seen_at": now_iso,
            "is_active": True,
        }
        if posted_ts and posted_ts > 0:
            try:
                row["posted_at"] = datetime.fromtimestamp(posted_ts, tz=timezone.utc).isoformat()
            except Exception:
                pass
        to_insert.append(row)

    print(f"[Batch Upsert] Found {len(to_insert)} new unique job(s) out of {len(jobs)} inputs.", flush=True)

    if not to_insert:
        return 0

    inserted_count = 0
    if supabase:
        batch_size = 200
        for i in range(0, len(to_insert), batch_size):
            chunk = to_insert[i:i + batch_size]
            try:
                supabase.table("jobs").upsert(chunk, on_conflict="external_uid").execute()
                inserted_count += len(chunk)
                print(f"[Batch Upsert] Synced {inserted_count}/{len(to_insert)} jobs to Supabase...", flush=True)
            except Exception as e:
                print(f"[Batch Upsert] Error inserting chunk {i}-{i+len(chunk)}: {e}", flush=True)
                for item in chunk:
                    try:
                        supabase.table("jobs").upsert(item, on_conflict="external_uid").execute()
                        inserted_count += 1
                    except Exception:
                        pass
    else:
        inserted_count = len(to_insert)

    # Update seen_jobs.json once
    local_seen.update(seen_in_batch)
    _save_local_seen_jobs(local_seen)
    print(f"[Batch Upsert] Successfully committed {inserted_count} jobs and updated seen_jobs.json.", flush=True)
    return inserted_count




def create_user_with_filters(email: str, webhook_url: str, platform: str, keywords: list, countries: list, roles: list, min_grad_year: int = None, job_type: str = "internship"):
    """
    Creates or updates a user and their associated filters in the database.
    """
    global supabase
    if not supabase:
        return None
        
    try:
        res = supabase.table("users").select("id").eq("webhook_url", webhook_url).execute()
        if res.data:
            user_id = res.data[0]["id"]
            supabase.table("users").update({
                "email": email,
                "platform": platform
            }).eq("id", user_id).execute()
        else:
            res_insert = supabase.table("users").insert({
                "email": email,
                "webhook_url": webhook_url,
                "platform": platform
            }).execute()
            user_id = res_insert.data[0]["id"]
            
        filter_payload = {
            "user_id": user_id,
            "keywords": keywords,
            "countries": countries,
            "roles": roles,
            "min_grad_year": min_grad_year,
        }
        if job_type:
            filter_payload["job_type"] = job_type

        try:
            supabase.table("user_filters").upsert(filter_payload).execute()
        except Exception:
            # Fallback if job_type column does not exist in user_filters table
            filter_payload.pop("job_type", None)
            supabase.table("user_filters").upsert(filter_payload).execute()
        
        return user_id
    except Exception as e:
        print(f"Error creating/updating user {email}: {e}", flush=True)
        return None


def get_active_users():
    """
    Fetches all users and their filters from the database.
    Falls back to environment webhooks if database is empty or unavailable.
    """
    global supabase
    users = []
    if supabase:
        try:
            res = supabase.table("users").select("*, user_filters(*)").execute()
            if res.data:
                # Extract embedded user_filters array if returned as list
                for u in res.data:
                    f = u.get("user_filters")
                    if isinstance(f, list) and len(f) > 0:
                        u["user_filters"] = f[0]
                    users.append(u)
        except Exception as e:
            print(f"Error fetching active users from Supabase: {e}", flush=True)
            users = []

    # Fallback to env webhooks if no users retrieved
    if not users:
        canada_webhook = os.environ.get("SLACK_WEBHOOK_CANADA")
        usa_webhook = os.environ.get("SLACK_WEBHOOK_USA")
        newgrad_canada_webhook = os.environ.get("SLACK_WEBHOOK_NEWGRAD_CANADA")
        newgrad_usa_webhook = os.environ.get("SLACK_WEBHOOK_NEWGRAD_USA")
        other_webhook = os.environ.get("SLACK_WEBHOOK_URL")

        if canada_webhook:
            users.append({
                "email": "admin+canada@jobnotifier.com",
                "webhook_url": canada_webhook,
                "platform": "slack",
                "user_filters": {"countries": ["canada"], "job_type": "internship"}
            })
        if usa_webhook:
            users.append({
                "email": "admin+usa@jobnotifier.com",
                "webhook_url": usa_webhook,
                "platform": "slack",
                "user_filters": {"countries": ["usa"], "job_type": "internship"}
            })
        if newgrad_canada_webhook:
            users.append({
                "email": "admin+newgrad-canada@jobnotifier.com",
                "webhook_url": newgrad_canada_webhook,
                "platform": "slack",
                "user_filters": {"countries": ["canada"], "job_type": "newgrad"}
            })
        if newgrad_usa_webhook:
            users.append({
                "email": "admin+newgrad-usa@jobnotifier.com",
                "webhook_url": newgrad_usa_webhook,
                "platform": "slack",
                "user_filters": {"countries": ["usa"], "job_type": "newgrad"}
            })
        known_webhooks = {canada_webhook, usa_webhook, newgrad_canada_webhook, newgrad_usa_webhook}
        if other_webhook and other_webhook not in known_webhooks:
            users.append({
                "email": "admin+other@jobnotifier.com",
                "webhook_url": other_webhook,
                "platform": "slack",
                "user_filters": {"countries": ["other"], "job_type": "internship"}
            })

    return users


def seed_admin_users():
    """
    Seeds the admin users using the Slack Webhooks from the environment.
    """
    canada_webhook = os.environ.get("SLACK_WEBHOOK_CANADA")
    usa_webhook = os.environ.get("SLACK_WEBHOOK_USA")
    newgrad_canada_webhook = os.environ.get("SLACK_WEBHOOK_NEWGRAD_CANADA")
    newgrad_usa_webhook = os.environ.get("SLACK_WEBHOOK_NEWGRAD_USA")
    other_webhook = os.environ.get("SLACK_WEBHOOK_URL")

    if canada_webhook:
        create_user_with_filters(
            email="admin+canada@jobnotifier.com",
            webhook_url=canada_webhook,
            platform="slack",
            keywords=[],
            countries=["canada"],
            roles=[],
            job_type="internship"
        )

    if usa_webhook:
        create_user_with_filters(
            email="admin+usa@jobnotifier.com",
            webhook_url=usa_webhook,
            platform="slack",
            keywords=[],
            countries=["usa"],
            roles=[],
            job_type="internship"
        )

    if newgrad_canada_webhook:
        create_user_with_filters(
            email="admin+newgrad-canada@jobnotifier.com",
            webhook_url=newgrad_canada_webhook,
            platform="slack",
            keywords=[],
            countries=["canada"],
            roles=[],
            job_type="newgrad"
        )

    if newgrad_usa_webhook:
        create_user_with_filters(
            email="admin+newgrad-usa@jobnotifier.com",
            webhook_url=newgrad_usa_webhook,
            platform="slack",
            keywords=[],
            countries=["usa"],
            roles=[],
            job_type="newgrad"
        )

    known_webhooks = {canada_webhook, usa_webhook, newgrad_canada_webhook, newgrad_usa_webhook}
    if other_webhook and other_webhook not in known_webhooks:
        create_user_with_filters(
            email="admin+other@jobnotifier.com",
            webhook_url=other_webhook,
            platform="slack",
            keywords=[],
            countries=["other"],
            roles=[],
            job_type="internship"
        )

