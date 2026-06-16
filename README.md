# Job Monitor

Polls job listing sources every 30 minutes and posts new matches (filtered to
Canada / Seattle SWE-type roles) to a Slack channel via webhook.

## Sources
 
1. **SimplifyJobs/Summer2026-Internships** — `listings.json` feed (most reliable, JSON).
2. **negarprh/Canadian-Tech-Internships-2026** — parsed from the README markdown table.
3. **amazon.jobs** — public `search.json` endpoint, filtered to software-development
   roles in Canada and Seattle, WA.

## Setup

### 1. Create a Slack Incoming Webhook
- Go to https://api.slack.com/apps -> Create New App -> From scratch
- Enable "Incoming Webhooks", add a new webhook to your desired channel
- Copy the webhook URL (looks like `https://hooks.slack.com/services/T000/B000/XXXX`)

### 2. Push this repo to GitHub

```bash
cd job-monitor
git init
git add .
git commit -m "Initial job monitor"
gh repo create job-monitor --private --source=. --push
```

(or create the repo manually on github.com and push)

### 3. Add the Slack webhook as a repo secret
- Repo -> Settings -> Secrets and variables -> Actions -> New repository secret
- Name: `SLACK_WEBHOOK_URL`
- Value: the webhook URL from step 1

### 4. Enable Actions
- Go to the "Actions" tab and enable workflows if prompted
- The workflow runs every 30 minutes automatically, or trigger it manually via
  "Run workflow" (workflow_dispatch)

## Customizing filters

Edit `monitor.py`:
- `LOCATION_KEYWORDS` — location strings to match (lowercase substring match)
- `ROLE_KEYWORDS` — title keywords to match
- `AMAZON_LOCATIONS` — countries/states queried against amazon.jobs

## Notes

- First run will likely report a large batch of "new" jobs since `seen_jobs.json`
  starts empty — that's expected, it's seeding state. After that, only genuinely
  new postings trigger notifications.
- `seen_jobs.json` is committed back to the repo by the Action after each run.
- If a source's structure changes (e.g. the Canadian repo renames columns or
  branches), that fetcher fails soft and logs a warning — other sources still run.