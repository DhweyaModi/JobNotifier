from scrapers.simplify import fetch_simplify_jobs
from scrapers.canadian import fetch_canadian_jobs
from scrapers.amazon import fetch_amazon_jobs
from scrapers.google import fetch_google_jobs
from scrapers.summer2027 import fetch_summer2027_jobs
from scrapers.vansh import fetch_vansh_jobs
from scrapers.speedyapply import (
    fetch_speedyapply_ai_jobs,
    fetch_speedyapply_swe_jobs
)

SCRAPERS = [
    (fetch_google_jobs, "Google"),
    (fetch_simplify_jobs, "SimplifyJobs"),
    (fetch_canadian_jobs, "Canadian-Tech-Internships"),
    (fetch_amazon_jobs, "Amazon"),
    (fetch_summer2027_jobs, "Summer2027-Internships"),
    (fetch_vansh_jobs, "Vansh-Summer2027"),
    (fetch_speedyapply_ai_jobs, "SpeedyApply-AI"),
    (fetch_speedyapply_swe_jobs, "SpeedyApply-SWE"),
]
