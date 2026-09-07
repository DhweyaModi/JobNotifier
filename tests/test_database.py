import pytest
from unittest.mock import MagicMock, patch
from postgrest.exceptions import APIError
import db
from scrapers.base_scraper import generate_dedup_keys

def test_database_health_check_live():
    """Verify that live database write access is healthy and RLS is not blocking."""
    if not db.supabase:
        pytest.skip("Supabase not configured in environment")
    is_healthy, msg = db.verify_database_health()
    assert is_healthy is True, f"Database health check failed: {msg}"
    assert "verified successfully" in msg.lower()

def test_database_health_check_detects_rls_error():
    """Verify that verify_database_health properly catches RLS 42501 error and reports it."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.side_effect = APIError({
        "code": "42501",
        "message": "new row violates row-level security policy for table 'jobs'"
    })

    with patch.object(db, "supabase", mock_supabase):
        is_healthy, msg = db.verify_database_health()
        assert is_healthy is False
        assert "42501" in msg
        assert "Row-Level Security" in msg

def test_upsert_job_duplicate_key_returns_false():
    """Verify that duplicate key constraint (23505) cleanly returns False without logging errors."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.side_effect = APIError({
        "code": "23505",
        "message": "duplicate key value violates unique constraint"
    })

    with patch.object(db, "supabase", mock_supabase), \
         patch.object(db, "_load_local_seen_jobs", return_value=set()), \
         patch.object(db, "_save_local_seen_jobs") as mock_save:
        is_new = db.upsert_job(
            uid="test:dup-1",
            source="TestScraper",
            title="Software Engineer",
            company="DupCo",
            location="Remote",
            country="usa",
            url="https://example.com/job1"
        )
        assert is_new is False
        # Must NOT add to seen_jobs
        mock_save.assert_not_called()

def test_upsert_job_database_error_does_not_fail_silently():
    """
    CRITICAL TEST:
    If a database insert fails with RLS or network error, verify:
    1. It does NOT return True (must return False).
    2. It does NOT save the failed job into seen_jobs.json (prevents desync).
    """
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.side_effect = APIError({
        "code": "42501",
        "message": "permission denied for table jobs"
    })

    with patch.object(db, "supabase", mock_supabase), \
         patch.object(db, "_load_local_seen_jobs", return_value=set()), \
         patch.object(db, "_save_local_seen_jobs") as mock_save:
        is_new = db.upsert_job(
            uid="test:failed-insert-1",
            source="TestScraper",
            title="Software Engineer",
            company="FailCo",
            location="Remote",
            country="usa",
            url="https://example.com/fail"
        )
        assert is_new is False, "Failed insert must not be reported as new"
        mock_save.assert_not_called(), "Failed insert must NOT be marked seen in seen_jobs.json"

def test_newgrad_and_internship_dedup_separation():
    """Verify that identical roles across New Grad and Internship do not collide in dedup keys."""
    intern_keys = generate_dedup_keys(
        company="Google",
        title="Software Engineer Intern",
        country="usa",
        url="https://careers.google.com/jobs/1",
        job_type="internship"
    )
    newgrad_keys = generate_dedup_keys(
        company="Google",
        title="Software Engineer New Grad",
        country="usa",
        url="https://careers.google.com/jobs/2",
        job_type="newgrad"
    )

    # Cross-collision check
    overlap = set(intern_keys) & set(newgrad_keys)
    assert len(overlap) == 0, f"Internship and New Grad keys must not collide! Overlap: {overlap}"

    # Verify newgrad namespace prefix
    assert any("role:newgrad:google:" in k for k in newgrad_keys)
    assert all("role:newgrad:" not in k for k in intern_keys)
