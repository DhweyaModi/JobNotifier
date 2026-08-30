# JobNotifier

A modular scraper, database-backed tracker, and user notification fan-out engine for internships and tech roles.

## Architecture & Structure
- **`scrapers/`**: Modular scraper functions (SimplifyJobs, Canadian Tech Internships, Amazon Jobs, etc.) utilizing a clean, line-based parser to avoid boundary-crossing errors.
- **`db.py`**: Handles connections to Supabase (Postgres) and manages job upserts, user filter configurations, and admin seeding.
- **`notifier.py`**: Matches scraped jobs against user filters and formats/routes payloads cleanly to Slack (`{"text": ...}`) or Discord (`{"content": ...}`).
- **`monitor.py`**: Scraper CLI entrypoint.
- **`tests/`**: Unit testing suite containing mock tables and parser test cases.

---

## Local Setup

### 1. Prerequisites
Ensure you have Python 3.12+ installed. Create a virtual environment and install requirements:

```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Database Setup
1. Create a free project on [Supabase](https://supabase.com/).
2. Run the DDL commands from `schema.sql` in the Supabase **SQL Editor** to initialize the database tables and disable Row Level Security (RLS) for scraper access.

### 3. Environment Configuration
Create a `.env` file in the root of this project:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-anon-or-service-role-key"

# Slack Webhook URLs for Admin Seeding
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
SLACK_WEBHOOK_USA="https://hooks.slack.com/services/..."
SLACK_WEBHOOK_CANADA="https://hooks.slack.com/services/..."
```

---

## Running & Testing

### 1. Scraper & Backend Pipeline
To scrape job boards, upsert matches, and notify configured users:
```bash
python monitor.py
```
*(When run locally, this will automatically detect environment webhooks and seed/update the admin users in the database).*

### 2. Backend Unit & Parser Tests (Pytest)
To run backend unit tests and verify scraper parsing against mock fixtures:
```bash
PYTHONPATH=. pytest
```

### 3. Frontend & Logic Tests (Node Test Runner)
To test title normalization, deduplication, country isolation (Canada vs USA), and Kanban pipeline logic:
```bash
cd web
npm test
```

### 4. Database & Supabase Health Check
To verify live Supabase credentials and database table accessibility (`jobs`, `users`, `applications`):
```bash
cd web
npm run health
```

### 5. Frontend Development & Build
To run the local Next.js dashboard or test the production build:
```bash
cd web
npm run dev     # Start local development server (http://localhost:3000)
npm run build   # Test production compilation for Vercel
```