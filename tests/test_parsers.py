import pytest
from scrapers.canadian import _parse_canadian_readme
from scrapers.vansh import fetch_vansh_jobs
from scrapers.summer2027 import fetch_summer2027_jobs
from scrapers.speedyapply import _fetch_speedyapply_source
from scrapers.base_scraper import (
    role_matches,
    is_internship,
    classify_country,
    _strip_html,
    _extract_href
)

# --- Tricky Snippets for Testing -------------------------------------------

CANADIAN_MOCK_README = """
# Canadian Tech Internships

| Company | Role | Location | Application Link/Status | Date Posted |
|---|---|---|---|---|
| Google | Software Engineer Intern | Toronto, ON | [![Apply](badge)](https://google.com/jobs) | Jul 1 |
| ↳ | Machine Learning Intern | Toronto, ON | [![Apply](badge)](https://google.com/jobs-ml) | Jul 2 |
| Microsoft | Product Manager Intern | Vancouver, BC | [![Apply](badge)](https://microsoft.com/jobs) | Jul 3 |
|  | - | - | - | - |
| Apple | SWE Intern | Toronto, ON | [![Apply](badge)](https://apple.com/jobs) | Jul 4 |
"""

VANSH_MOCK_README = """
# Vansh Summer 2027 Internships

| Company | Role | Location | Application/Link | Date Posted |
|---|---|---|---|---|
| Stripe | Software Engineering Intern | Remote | <a href="https://stripe.com/jobs">Apply</a> | Jul 1 |
| ↳ | Backend Engineer Intern | Remote | <a href="https://stripe.com/jobs-be">Apply</a> | Jul 2 |
| Random | HR Intern | New York | <a href="https://random.com">Apply</a> | Jul 3 |
"""

SUMMER2027_MOCK_README = """
# Summer 2027 Internships

| Company | Role | Location | Application | Added |
|---|---|---|---|---|
| Netflix | Software Engineer Intern | Los Gatos, CA | [apply](https://netflix.com/jobs) | Jul 1 |
| Amazon | Retail Associate | Seattle, WA | [apply](https://amazon.com) | Jul 2 |
"""

SPEEDYAPPLY_MOCK_README = """
# SpeedyApply SWE College Jobs

| Company | Position | Location | Salary | Posting | Age |
|---|---|---|---|---|---|
| <a><strong>Meta</strong></a> | Software Engineer - Intern - US | Menlo Park, CA | $10000 | <a href="https://meta.com/jobs">Apply</a> | 1d |
| <a><strong>Junk</strong></a> | Janitor | Chicago, IL | $15 | <a href="https://junk.com">Apply</a> | 2d |
"""

from unittest.mock import patch, MagicMock

# --- Tests -----------------------------------------------------------------

def test_role_and_internship_matching():
    # Matches software, swe, engineer, developer, etc.
    assert role_matches("Software Engineer Intern") is True
    assert role_matches("SWE Developer") is True
    assert role_matches("Janitor") is False

    # Matches co-op, coop, intern, internship
    assert is_internship("Software Engineering Intern") is True
    assert is_internship("Co-op Software Developer") is True
    assert is_internship("Full time Engineer") is False

def test_classify_country():
    assert classify_country("Toronto, ON") == "canada"
    assert classify_country("Seattle, WA, USA") == "usa"
    assert classify_country("London, UK") == "other"
    assert classify_country("Vancouver, BC / Seattle, WA") == "both"
    # False positive prevention edge cases
    assert classify_country("Toronto, ON (In Office)") == "canada"
    assert classify_country("Toronto, ON or Vancouver, BC") == "canada"
    assert classify_country("Seattle, WA (On-site)") == "usa"
    assert classify_country("Campus Locations - Canada") == "canada"
    assert classify_country("Co-op - Toronto, ON") == "canada"
    assert classify_country("Remote - US & Canada") == "both"
    # US cities with names matching CA cities (Richmond VA, Burlington MA, Markham IL, Waterloo IA)
    assert classify_country("Richmond, VA") == "usa"
    assert classify_country("Burlington, MA") == "usa"
    assert classify_country("Markham, IL") == "usa"
    assert classify_country("Waterloo, IA") == "usa"
    assert classify_country("Canadian County, OK") == "usa"

def test_match_job_filters():
    from notifier import match_job_filters
    
    canadian_job = ("Canadian", "Firmware Developer Co-op", "Arlo", "Richmond, BC", "https://example.com/1")
    usa_job = ("Simplify", "Software Intern", "Etched.ai", "San Jose, CA", "https://example.com/2")
    both_job = ("Simplify", "ML Intern", "Yotta Labs", "Remote in USA, Remote in Canada", "https://example.com/3")
    other_job = ("Simplify", "SWE Intern", "Company", "London, UK", "https://example.com/4")
    
    canada_filter = {"countries": ["canada"]}
    usa_filter = {"countries": ["usa"]}
    other_filter = {"countries": ["other"]}
    
    # Canada channel should match Canadian jobs & Both jobs, but NOT USA or Other jobs
    assert match_job_filters(canadian_job, canada_filter) is True
    assert match_job_filters(both_job, canada_filter) is True
    assert match_job_filters(usa_job, canada_filter) is False
    assert match_job_filters(other_job, canada_filter) is False

    # USA channel should match USA jobs & Both jobs, but NOT Canadian or Other jobs
    assert match_job_filters(usa_job, usa_filter) is True
    assert match_job_filters(both_job, usa_filter) is True
    assert match_job_filters(canadian_job, usa_filter) is False
    assert match_job_filters(other_job, usa_filter) is False
    
    # Other channel should match Other jobs only
    assert match_job_filters(other_job, other_filter) is True
    assert match_job_filters(canadian_job, other_filter) is False
    assert match_job_filters(usa_job, other_filter) is False

def test_html_helpers():
    assert _strip_html("<a><strong>Meta</strong></a>") == "Meta"
    assert _extract_href('<a href="https://stripe.com/jobs">Apply</a>') == "https://stripe.com/jobs"

def test_canadian_parser():
    # Parsing the mock readme
    results = _parse_canadian_readme(CANADIAN_MOCK_README, "2026")
    
    # Expected:
    # 1. Google - Software Engineer Intern (Toronto)
    # 2. Google - Machine Learning Intern (Toronto, via ↳ row)
    # 3. Apple - SWE Intern (Toronto)
    # Note: Microsoft is skipped because "Product Manager" doesn't match role_matches.
    assert len(results) == 3
    
    assert results[0][2] == "Google"
    assert results[0][1] == "Software Engineer Intern"
    assert results[0][4] == "https://google.com/jobs"
    
    assert results[1][2] == "Google"  # ↳ resolved to Google
    assert results[1][1] == "Machine Learning Intern"
    assert results[1][4] == "https://google.com/jobs-ml"
    
    assert results[2][2] == "Apple"
    assert results[2][1] == "SWE Intern"

def test_vansh_parser():
    mock_resp = MagicMock()
    mock_resp.text = VANSH_MOCK_README
    mock_resp.status_code = 200
    
    with patch("requests.get", return_value=mock_resp) as mock_get:
        results = fetch_vansh_jobs()
        mock_get.assert_called_once_with(
            "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/main/README.md",
            timeout=30
        )
        # Expected:
        # 1. Stripe - Software Engineering Intern
        # 2. Stripe - Backend Engineer Intern
        assert len(results) == 2
        assert results[0][2] == "Stripe"
        assert results[1][2] == "Stripe"  # ↳ resolved
        assert results[0][4] == "https://stripe.com/jobs"

def test_summer2027_parser():
    mock_resp = MagicMock()
    mock_resp.text = SUMMER2027_MOCK_README
    mock_resp.status_code = 200
    
    with patch("requests.get", return_value=mock_resp) as mock_get:
        results = fetch_summer2027_jobs()
        mock_get.assert_called_once_with(
            "https://raw.githubusercontent.com/sndsh404/summer-2027-internships/main/README.md",
            timeout=30
        )
        # Expected:
        # 1. Netflix - Software Engineer Intern
        assert len(results) == 1
        assert results[0][2] == "Netflix"
        assert results[0][4] == "https://netflix.com/jobs"

SPEEDYAPPLY_MOCK_INTL_README = """
# SpeedyApply SWE International Jobs

| Company | Position | Location | Posting | Age |
|---|---|---|---|---|
| <a href="https://stripe.com"><strong>Stripe</strong></a> | Software Engineer - New Grad | Toronto, Canada | <a href="https://stripe.com/jobs/8157838">Apply</a> | 5d |
| <a><strong>Junk</strong></a> | Janitor | Toronto, Canada | <a href="https://junk.com">Apply</a> | 1d |
"""

def test_speedyapply_parser():
    mock_resp = MagicMock()
    mock_resp.text = SPEEDYAPPLY_MOCK_README
    mock_resp.status_code = 200
    
    with patch("requests.get", return_value=mock_resp) as mock_get:
        results = _fetch_speedyapply_source("speedyapply-swe", "https://mock-url.com")
        mock_get.assert_called_once_with("https://mock-url.com", timeout=30)
        
        # Expected:
        # 1. Meta - Software Engineer - Intern - US
        # Note: Junk is skipped because "Janitor" doesn't match role_matches.
        assert len(results) == 1
        assert results[0][2] == "Meta"
        assert results[0][4] == "https://meta.com/jobs"


def test_speedyapply_5col_intl_parser():
    mock_resp = MagicMock()
    mock_resp.text = SPEEDYAPPLY_MOCK_INTL_README
    mock_resp.status_code = 200
    
    with patch("requests.get", return_value=mock_resp) as mock_get:
        results = _fetch_speedyapply_source("speedyapply-swe-newgrad-intl", "https://mock-intl-url.com")
        mock_get.assert_called_once_with("https://mock-intl-url.com", timeout=30)
        
        # Expected:
        # 1. Stripe - Software Engineer - New Grad (Toronto, Canada)
        assert len(results) == 1
        assert results[0][2] == "Stripe"
        assert results[0][1] == "Software Engineer - New Grad"
        assert results[0][3] == "Toronto, Canada"
        assert results[0][4] == "https://stripe.com/jobs/8157838"


def test_deduplication_normalization():
    from scrapers.base_scraper import normalize_company, normalize_title, normalize_url, generate_dedup_keys

    # Company normalization
    assert normalize_company("Datadog, Inc.") == "datadog"
    assert normalize_company("Shopify Labs Ltd.") == "shopify"
    assert normalize_company("Meta Platforms (US)") == "meta"

    # Title normalization
    assert normalize_title("Software Engineering Intern - Summer 2026") == "software engineer"
    assert normalize_title("SWE Intern (2026/2027)") == "software engineer"
    assert normalize_title("Software Developer Co-op") == "software engineer"
    assert normalize_title("Data Science Intern - Fall 2026") == "data scientist"
    assert normalize_title("Machine Learning Intern") == "machine learning"

    # URL normalization
    assert normalize_url("https://boards.greenhouse.io/stripe/jobs/123456?gh_src=summer2026&utm_campaign=tracker") == "boards.greenhouse.io/stripe/jobs/123456"
    assert normalize_url("https://boards.greenhouse.io/stripe/jobs/123456/") == "boards.greenhouse.io/stripe/jobs/123456"

    # Dedup keys match across duplicate scrapers
    keys1 = generate_dedup_keys("Datadog, Inc.", "Software Engineering Intern - Summer 2026", "usa", "https://boards.greenhouse.io/datadog/jobs/101?utm_source=gh")
    keys2 = generate_dedup_keys("Datadog", "SWE Intern", "usa", "https://boards.greenhouse.io/datadog/jobs/101")
    
    # Common URL key and role key must overlap
    assert "url:boards.greenhouse.io/datadog/jobs/101" in keys1
    assert "url:boards.greenhouse.io/datadog/jobs/101" in keys2
    assert "role:datadog:software engineer:usa" in keys1
    assert "role:datadog:software engineer:usa" in keys2


def test_google_careers_parser():
    from scrapers.google import _extract_from_callbacks, fetch_google_jobs

    mock_html = """
    <html><body>
    <script>
    AF_initDataCallback({key: 'ds:1', hash: '2', data:[[
        ["123510626377966278", "Software Developer Intern, BS, Summer 2027", "https://apply.google.com/1", null, null, null, null, "Google", "en-US",
         [["Waterloo, ON, Canada", ["Waterloo, ON, Canada"], "Waterloo", null, "Ontario", "CA"],
          ["Toronto, ON, Canada", ["Toronto, ON, Canada"], "Toronto", null, "Ontario", "CA"]],
         null, [4], [1786974135, 609000000]],
        ["100648618540573382", "Software Engineering Intern, BS, Summer 2027", "https://apply.google.com/2", null, null, null, null, "Google", "en-US",
         [["Mountain View, CA, USA", ["Mountain View, CA, USA"], "Mountain View", null, "California", "US"],
          ["Seattle, WA, USA", ["Seattle, WA, USA"], "Seattle", null, "Washington", "US"]],
         null, [4], [1786974135, 609000000]]
    ]]});
    </script>
    </body></html>
    """
    results = _extract_from_callbacks(mock_html)
    assert len(results) == 2
    assert results[0]["id"] == "123510626377966278"
    assert results[0]["title"] == "Software Developer Intern, BS, Summer 2027"
    assert "Waterloo, ON, Canada" in results[0]["location"]
    assert "Toronto, ON, Canada" in results[0]["location"]

    assert results[1]["id"] == "100648618540573382"
    assert "Mountain View, CA, USA" in results[1]["location"]
    assert "Seattle, WA, USA" in results[1]["location"]

    # Verify country classification
    from scrapers.base_scraper import classify_country
    assert classify_country(results[0]["location"]) == "canada"
    assert classify_country(results[1]["location"]) == "usa"



def test_newgrad_channel_routing_and_segregation():
    from notifier import match_job_filters

    intern_ca = ("Canadian-Tech-Internships", "SWE Intern", "Shopify", "Toronto, ON", "https://shopify.com/1")
    intern_us = ("SimplifyJobs-Internships", "Software Engineer Intern", "Meta", "Menlo Park, CA", "https://meta.com/1")
    newgrad_ca = ("SimplifyJobs-NewGrad", "Software Engineer - New Grad", "Amazon", "Vancouver, BC", "https://amazon.com/1")
    newgrad_us = ("SimplifyJobs-NewGrad", "Associate SWE (New Grad)", "Google", "Mountain View, CA", "https://google.com/1")
    newgrad_both = ("SimplifyJobs-NewGrad", "ML Engineer - Early Career", "Cohere", "Remote in USA, Remote in Canada", "https://cohere.ai/1")

    filter_intern_ca = {"countries": ["canada"], "job_type": "internship"}
    filter_intern_us = {"countries": ["usa"], "job_type": "internship"}
    filter_newgrad_ca = {"countries": ["canada"], "job_type": "newgrad"}
    filter_newgrad_us = {"countries": ["usa"], "job_type": "newgrad"}

    # 1. Canada Internship Channel: ONLY matches Canadian internships
    assert match_job_filters(intern_ca, filter_intern_ca) is True
    assert match_job_filters(intern_us, filter_intern_ca) is False
    assert match_job_filters(newgrad_ca, filter_intern_ca) is False
    assert match_job_filters(newgrad_us, filter_intern_ca) is False
    assert match_job_filters(newgrad_both, filter_intern_ca) is False

    # 2. USA Internship Channel: ONLY matches USA internships
    assert match_job_filters(intern_us, filter_intern_us) is True
    assert match_job_filters(intern_ca, filter_intern_us) is False
    assert match_job_filters(newgrad_ca, filter_intern_us) is False
    assert match_job_filters(newgrad_us, filter_intern_us) is False
    assert match_job_filters(newgrad_both, filter_intern_us) is False

    # 3. Canada New Grad Channel: ONLY matches Canadian New Grad jobs
    assert match_job_filters(newgrad_ca, filter_newgrad_ca) is True
    assert match_job_filters(newgrad_both, filter_newgrad_ca) is True
    assert match_job_filters(newgrad_us, filter_newgrad_ca) is False
    assert match_job_filters(intern_ca, filter_newgrad_ca) is False
    assert match_job_filters(intern_us, filter_newgrad_ca) is False

    # 4. USA New Grad Channel: ONLY matches USA New Grad jobs
    assert match_job_filters(newgrad_us, filter_newgrad_us) is True
    assert match_job_filters(newgrad_both, filter_newgrad_us) is True
    assert match_job_filters(newgrad_ca, filter_newgrad_us) is False
    assert match_job_filters(intern_ca, filter_newgrad_us) is False
    assert match_job_filters(intern_us, filter_newgrad_us) is False


def test_db_get_active_users_includes_all_channels():
    import os
    import db
    from unittest.mock import patch

    env_vars = {
        "SLACK_WEBHOOK_CANADA": "https://hooks.slack.com/canada",
        "SLACK_WEBHOOK_USA": "https://hooks.slack.com/usa",
        "SLACK_WEBHOOK_NEWGRAD_CANADA": "https://hooks.slack.com/newgrad-canada",
        "SLACK_WEBHOOK_NEWGRAD_USA": "https://hooks.slack.com/newgrad-usa",
    }

    with patch.dict(os.environ, env_vars, clear=False), patch.object(db, "supabase", None):
        users = db.get_active_users()
        emails = {u["email"]: u for u in users}

        assert "admin+canada@jobnotifier.com" in emails
        assert emails["admin+canada@jobnotifier.com"]["user_filters"] == {"countries": ["canada"], "job_type": "internship"}
        assert emails["admin+canada@jobnotifier.com"]["webhook_url"] == "https://hooks.slack.com/canada"

        assert "admin+usa@jobnotifier.com" in emails
        assert emails["admin+usa@jobnotifier.com"]["user_filters"] == {"countries": ["usa"], "job_type": "internship"}
        assert emails["admin+usa@jobnotifier.com"]["webhook_url"] == "https://hooks.slack.com/usa"

        assert "admin+newgrad-canada@jobnotifier.com" in emails
        assert emails["admin+newgrad-canada@jobnotifier.com"]["user_filters"] == {"countries": ["canada"], "job_type": "newgrad"}
        assert emails["admin+newgrad-canada@jobnotifier.com"]["webhook_url"] == "https://hooks.slack.com/newgrad-canada"

        assert "admin+newgrad-usa@jobnotifier.com" in emails
        assert emails["admin+newgrad-usa@jobnotifier.com"]["user_filters"] == {"countries": ["usa"], "job_type": "newgrad"}
        assert emails["admin+newgrad-usa@jobnotifier.com"]["webhook_url"] == "https://hooks.slack.com/newgrad-usa"


def test_speedyapply_newgrad_routing():
    from notifier import match_job_filters

    # SpeedyApply New Grad jobs
    speedy_ca_newgrad = ("SpeedyApply-SWE-NewGrad", "Software Engineer - New Grad", "Stripe", "Toronto, ON", "https://stripe.com/jobs/1")
    speedy_us_newgrad = ("SpeedyApply-SWE-NewGrad", "Software Dev Engineer I", "Amazon", "Austin, TX", "https://amazon.jobs/1")
    speedy_ai_newgrad = ("SpeedyApply-AI-NewGrad", "Machine Learning Engineer - Early Career", "Anthropic", "San Francisco, CA", "https://anthropic.com/1")

    # SpeedyApply Internship jobs
    speedy_swe_intern = ("SpeedyApply-SWE", "Software Engineer - Intern - US", "Meta", "Menlo Park, CA", "https://meta.com/jobs/1")

    ca_newgrad_filter = {"countries": ["canada"], "job_type": "newgrad"}
    us_newgrad_filter = {"countries": ["usa"], "job_type": "newgrad"}
    us_intern_filter = {"countries": ["usa"], "job_type": "internship"}

    # Segregation checks
    assert match_job_filters(speedy_ca_newgrad, ca_newgrad_filter) is True
    assert match_job_filters(speedy_ca_newgrad, us_newgrad_filter) is False
    assert match_job_filters(speedy_ca_newgrad, us_intern_filter) is False

    assert match_job_filters(speedy_us_newgrad, us_newgrad_filter) is True
    assert match_job_filters(speedy_us_newgrad, ca_newgrad_filter) is False
    assert match_job_filters(speedy_us_newgrad, us_intern_filter) is False

    assert match_job_filters(speedy_ai_newgrad, us_newgrad_filter) is True
    assert match_job_filters(speedy_ai_newgrad, us_intern_filter) is False

    assert match_job_filters(speedy_swe_intern, us_intern_filter) is True
    assert match_job_filters(speedy_swe_intern, us_newgrad_filter) is False
    assert match_job_filters(speedy_swe_intern, ca_newgrad_filter) is False


def test_admin_channels_strict_job_type_isolation():
    """Verify that internships never route to new grad channels and new grads never route to internship channels."""
    from notifier import match_job_filters

    walmart_intern = ("SimplifyJobs", "Transportation Data Analyst 2 Intern", "Walmart", "Bentonville, AR", "https://walmart.com")
    canadian_intern = ("Canadian-Tech-Internships", "Software Engineer Intern", "Shopify", "Toronto, ON", "https://shopify.com")
    newgrad_usa = ("SimplifyJobs-NewGrad", "Software Engineer - New Grad", "Google", "Mountain View, CA", "https://google.com")
    newgrad_ca = ("SimplifyJobs-NewGrad", "Software Engineer - New Grad", "Shopify", "Toronto, ON", "https://shopify.com")

    # Filters with explicit job_type partition
    admin_usa_intern = {"countries": ["usa"], "job_type": "internship"}
    admin_ca_intern = {"countries": ["canada"], "job_type": "internship"}
    admin_usa_newgrad = {"countries": ["usa"], "job_type": "newgrad"}
    admin_ca_newgrad = {"countries": ["canada"], "job_type": "newgrad"}

    # USA Internship routes to USA Internship ONLY
    assert match_job_filters(walmart_intern, admin_usa_intern) is True
    assert match_job_filters(walmart_intern, admin_ca_intern) is False
    assert match_job_filters(walmart_intern, admin_usa_newgrad) is False
    assert match_job_filters(walmart_intern, admin_ca_newgrad) is False

    # Canada Internship routes to Canada Internship ONLY
    assert match_job_filters(canadian_intern, admin_ca_intern) is True
    assert match_job_filters(canadian_intern, admin_usa_intern) is False
    assert match_job_filters(canadian_intern, admin_ca_newgrad) is False
    assert match_job_filters(canadian_intern, admin_usa_newgrad) is False

    # USA New Grad routes to USA New Grad ONLY
    assert match_job_filters(newgrad_usa, admin_usa_newgrad) is True
    assert match_job_filters(newgrad_usa, admin_usa_intern) is False
    assert match_job_filters(newgrad_usa, admin_ca_newgrad) is False
    assert match_job_filters(newgrad_usa, admin_ca_intern) is False

    # Canada New Grad routes to Canada New Grad ONLY
    assert match_job_filters(newgrad_ca, admin_ca_newgrad) is True
    assert match_job_filters(newgrad_ca, admin_ca_intern) is False
    assert match_job_filters(newgrad_ca, admin_usa_newgrad) is False
    assert match_job_filters(newgrad_ca, admin_usa_intern) is False


def test_monitor_newgrad_execution():
    from monitor import run_monitor
    from scrapers import NEWGRAD_SCRAPERS

    mock_scraper = MagicMock(return_value=[
        ("mock-id:1", "Software Engineer - New Grad", "Shopify", "Toronto, ON", "https://shopify.com/1", "1d")
    ])
    test_scrapers = [(mock_scraper, "SpeedyApply-SWE-NewGrad")]

    with patch("db.seed_admin_users") as mock_seed, \
         patch("db.upsert_job", return_value=True) as mock_upsert, \
         patch("monitor.notify_users") as mock_notify:
        
        run_monitor(scrapers_list=test_scrapers, mode_label="New Grad Test")

        mock_seed.assert_called_once()
        mock_scraper.assert_called_once()
        mock_upsert.assert_called_once()
        mock_notify.assert_called_once()
        sent_jobs = mock_notify.call_args[0][0]
        assert len(sent_jobs) == 1
        assert sent_jobs[0][0] == "SpeedyApply-SWE-NewGrad"
        assert sent_jobs[0][1] == "Software Engineer - New Grad"
        assert sent_jobs[0][2] == "Shopify"


def test_google_scraper_filtering():
    from scrapers.google import fetch_google_jobs
    
    mock_payload = [
        {"id": "1", "title": "Part-Time Software Engineering BS/MS Intern, 2027", "location": "Tel Aviv, Israel"},
        {"id": "2", "title": "Software Engineer, gReach Program for People with Disabilities", "location": "Beijing, China"},
        {"id": "3", "title": "Silicon Engineering Intern, PhD, Summer 2027", "location": "Bengaluru, India"},
        {"id": "4", "title": "Hardware/Silicon Engineering PhD Intern, 2027", "location": "Haifa, Israel"},
        {"id": "5", "title": "Student Researcher Program Manager, Talent Engagement", "location": "London, UK"},
        {"id": "6", "title": "Software Engineering Intern, BS, Summer 2027", "location": "Mountain View, CA"},
        {"id": "7", "title": "Open Engineering Career Opportunities, CapitalG Portfolio", "location": "Remote"},
    ]

    with patch("requests.get") as mock_get, \
         patch("scrapers.google._extract_from_callbacks", return_value=mock_payload):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = "<html>mock</html>"
        mock_get.return_value = mock_resp

        jobs = fetch_google_jobs()
        job_titles = [j[1] for j in jobs]

        # Valid tech internships (including PhD and BS/MS) must be kept
        assert "Part-Time Software Engineering BS/MS Intern, 2027" in job_titles
        assert "Silicon Engineering Intern, PhD, Summer 2027" in job_titles
        assert "Hardware/Silicon Engineering PhD Intern, 2027" in job_titles
        assert "Software Engineering Intern, BS, Summer 2027" in job_titles

        # Non-intern programs and staff/management roles must be excluded
        assert "Software Engineer, gReach Program for People with Disabilities" not in job_titles
        assert "Student Researcher Program Manager, Talent Engagement" not in job_titles
        assert "Open Engineering Career Opportunities, CapitalG Portfolio" not in job_titles


def test_newgrad_scrapers_discard_internships():
    from scrapers.simplify import _fetch_from_simplify_json
    from scrapers.speedyapply import _fetch_speedyapply_source

    # Mock Simplify JSON
    mock_simplify_data = [
        {"id": "ng1", "title": "Software Engineer - New Grad", "company_name": "Google", "active": True, "is_visible": True},
        {"id": "int1", "title": "Software Engineer Intern", "company_name": "Autodesk", "active": True, "is_visible": True},
        {"id": "int2", "title": "Data Analyst Co-op", "company_name": "Perry Homes", "active": True, "is_visible": True},
        {"id": "ng2", "title": "Internal Tools Engineer", "company_name": "PlanetScale", "active": True, "is_visible": True},
    ]

    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_simplify_data
        mock_get.return_value = mock_resp

        # When fetching as newgrad, stray internships must be excluded while internal tools is kept
        ng_jobs = _fetch_from_simplify_json("mock_url", id_prefix="simplify-newgrad", is_newgrad=True)
        ng_titles = [j[1] for j in ng_jobs]
        assert "Software Engineer - New Grad" in ng_titles
        assert "Internal Tools Engineer" in ng_titles
        assert "Software Engineer Intern" not in ng_titles
        assert "Data Analyst Co-op" not in ng_titles







