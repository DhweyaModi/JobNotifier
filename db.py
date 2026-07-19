import os
from supabase import create_client, Client
from postgrest.exceptions import APIError
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upsert_job(uid: str, source: str, title: str, company: str, location: str, country: str, url: str) -> bool:
    """
    Inserts a job into the database. If it already exists (external_uid constraint),
    does nothing and returns False.
    Returns True if it is a new job (successfully inserted), False otherwise.
    """
    global supabase
    if not supabase:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if url and key:
            supabase = create_client(url, key)
        else:
            print("Error: SUPABASE_URL or SUPABASE_KEY is missing from environment.", flush=True)
            return False

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
        
        return len(response.data) > 0
    except APIError as e:
        # 23505 is PostgreSQL code for unique_violation
        if e.code == "23505":
            return False
        print(f"Supabase APIError during insert: {e}", flush=True)
        return False
    except Exception as e:
        err_str = str(e)
        if "23505" in err_str or "duplicate key" in err_str:
            return False
        print(f"Unexpected error during insert: {e}", flush=True)
        return False

def create_user_with_filters(email: str, webhook_url: str, platform: str, keywords: list, countries: list, roles: list, min_grad_year: int = None):
    """
    Creates or updates a user and their associated filters in the database.
    """
    global supabase
    if not supabase:
        return None
        
    try:
        # Check if user already exists with this webhook URL
        res = supabase.table("users").select("id").eq("webhook_url", webhook_url).execute()
        if res.data:
            user_id = res.data[0]["id"]
            # Update user profile
            supabase.table("users").update({
                "email": email,
                "platform": platform
            }).eq("id", user_id).execute()
        else:
            # Create user
            res_insert = supabase.table("users").insert({
                "email": email,
                "webhook_url": webhook_url,
                "platform": platform
            }).execute()
            user_id = res_insert.data[0]["id"]
            
        # Upsert user filters
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
    """
    global supabase
    if not supabase:
        return []
        
    try:
        res = supabase.table("users").select("*, user_filters(*)").execute()
        return res.data
    except Exception as e:
        print(f"Error fetching active users: {e}", flush=True)
        return []

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
            countries=["canada", "both"],
            roles=[]
        )
        print("Admin Canada user seeded successfully.")

    if usa_webhook:
        create_user_with_filters(
            email="admin+usa@jobnotifier.com",
            webhook_url=usa_webhook,
            platform="slack",
            keywords=[],
            countries=["usa", "both"],
            roles=[]
        )
        print("Admin USA user seeded successfully.")

    if other_webhook:
        create_user_with_filters(
            email="admin+other@jobnotifier.com",
            webhook_url=other_webhook,
            platform="slack",
            keywords=[],
            countries=["other"],
            roles=[]
        )
        print("Admin Other user seeded successfully.")
