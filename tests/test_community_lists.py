from unittest.mock import MagicMock, patch

from scrapers.community_lists import parse_list_markdown, fetch_community_newgrad_jobs
from scrapers.base_scraper import parse_job_date

ZAPPLY = """
| Company | Role | Location | Posted | Visa | **Apply** |
|---------|------|----------|--------|------|----------|
| **Cisco** | Software Developer I (Full Time) - Canada | Ottawa | 13m |  | [<img src="images/apply.png" alt="Apply">](https://zapply.jobs/l/d/a?s=x) |
| **Altera** | Embedded Solutions Intern | Toronto | 1h |  | [<img src="images/apply.png" alt="Apply">](https://zapply.jobs/l/d/b?s=x) |
"""

TRACKER = """
| Category | Active listings |
|---|---|
| [Software](x.md) | 12 |

| Company | Role | Location | Terms | Date Posted | Days Old | Sources |
|---|---|---|---|---|---|---|
| [Bandwidth](https://boards.greenhouse.io/bandwidth/jobs/1) | Software Engineer Intern | Raleigh, NC | Summer 2027 | 2026-11-25 | 0 | s |
| [OldCo](https://boards.greenhouse.io/oldco/jobs/2) | Software Engineer Intern | Austin, TX | Summer 2026 | 2026-11-25 | 0 | s |
"""

DEVS = """
| Company | Role | Location | Experience | Posted | Apply |
| --- | --- | --- | --- | :---: | :---: |
| **Valiant** | Associate Software Engineer <sup>NEW</sup> | United States, Remote | 0-1 years | Nov 24 | <a href="https://devsunite.com/j?a=1&amp;b=2">Apply</a> |
| **InternCo** | Software Engineer Intern | Boston, MA | 0 | Nov 24 | <a href="https://x.com/i">Apply</a> |
"""


def test_zapply_internships_drop_full_time_and_keep_relative_date():
    rows = parse_list_markdown(ZAPPLY, "zapply", is_newgrad=False)
    assert [r[2] for r in rows] == ["Altera"]
    assert rows[0][4] == "https://zapply.jobs/l/d/b?s=x"
    assert rows[0][5] == "1h"
    assert parse_job_date("1h")[0] > 0


def test_tracker_filters_terms_and_uses_company_link():
    rows = parse_list_markdown(TRACKER, "tracker", terms_filter="2027")
    assert len(rows) == 1
    assert rows[0][2] == "Bandwidth"
    assert rows[0][4] == "https://boards.greenhouse.io/bandwidth/jobs/1"


def test_newgrad_drops_interns_and_unescapes_url():
    rows = parse_list_markdown(DEVS, "devs", is_newgrad=True)
    assert len(rows) == 1
    assert rows[0][1] == "Associate Software Engineer"
    assert rows[0][4] == "https://devsunite.com/j?a=1&b=2"


def test_fetch_survives_failed_source():
    with patch("requests.get", side_effect=Exception("boom")):
        assert fetch_community_newgrad_jobs() == []


def test_relative_weeks():
    assert parse_job_date("2w")[0] > 0
