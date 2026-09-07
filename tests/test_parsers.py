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




