import os
import json
from supabase import create_client, Client
from postgrest.exceptions import APIError
from dotenv import load_dotenv

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


def upsert_job(uid: str, source: str, title: str, company: str, location: str, country: str, url: str, posted_timestamp: int = 0, posted_date_str: str = "") -> bool:
    """
    Inserts a job into Supabase and local seen_jobs.json fallback.
    Returns True if it is a new job (successfully inserted), False if already seen.
    """
    global supabase
    local_seen = _load_local_seen_jobs()
    if uid in local_seen:
        return False

    is_new = False

    if supabase:
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
        except APIError as e:
            if e.code == "23505": # Duplicate key
                is_new = False
            else:
                is_new = True
        except Exception:
            is_new = True
    else:
        is_new = True

    if is_new:
        local_seen.add(uid)
        _save_local_seen_jobs(local_seen)

    return is_new


def create_user_with_filters(email: str, webhook_url: str, platform: str, keywords: list, countries: list, roles: list, min_grad_year: int = None):
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
            
        supabase.table("user_filters").upsert({
            "user_id": user_id,
            "keywords": keywords,
            "countries": countries,
            "roles": roles,
            "min_grad_year": min_grad_year
        }).execute()
        
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
        other_webhook = os.environ.get("SLACK_WEBHOOK_URL")

        if canada_webhook:
            users.append({
                "email": "admin+canada@jobnotifier.com",
                "webhook_url": canada_webhook,
                "platform": "slack",
                "user_filters": {"countries": ["canada"]}
            })
        if usa_webhook:
            users.append({
                "email": "admin+usa@jobnotifier.com",
                "webhook_url": usa_webhook,
                "platform": "slack",
                "user_filters": {"countries": ["usa"]}
            })
        if other_webhook and other_webhook not in (canada_webhook, usa_webhook):
            users.append({
                "email": "admin+other@jobnotifier.com",
                "webhook_url": other_webhook,
                "platform": "slack",
                "user_filters": {"countries": ["other"]}
            })

    return users


def seed_admin_users():
    """
    Seeds the admin users using the Slack Webhooks from the environment.
    """
    canada_webhook = os.environ.get("SLACK_WEBHOOK_CANADA")
    usa_webhook = os.environ.get("SLACK_WEBHOOK_USA")
    other_webhook = os.environ.get("SLACK_WEBHOOK_URL")

    if canada_webhook:
        create_user_with_filters(
            email="admin+canada@jobnotifier.com",
            webhook_url=canada_webhook,
            platform="slack",
            keywords=[],
            countries=["canada"],
            roles=[]
        )

    if usa_webhook:
        create_user_with_filters(
            email="admin+usa@jobnotifier.com",
            webhook_url=usa_webhook,
            platform="slack",
            keywords=[],
            countries=["usa"],
            roles=[]
        )

    if other_webhook:
        create_user_with_filters(
            email="admin+other@jobnotifier.com",
            webhook_url=other_webhook,
            platform="slack",
            keywords=[],
            countries=["other"],
            roles=[]
        )

