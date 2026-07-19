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


