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
        # Retry initialization in case environment variables were loaded late
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
