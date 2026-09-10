"""
JobNotifier Dedicated New Grad Monitor
Polls all New Grad sources (SimplifyJobs-NewGrad, SpeedyApply-SWE-NewGrad, SpeedyApply-AI-NewGrad)
and dispatches real-time alerts strictly to #new-grad-canada and #new-grad-usa.
"""
import argparse
from monitor import run_monitor
from scrapers import NEWGRAD_SCRAPERS

def main():
    parser = argparse.ArgumentParser(description="JobNotifier Dedicated New Grad Monitor")
    parser.add_argument(
        "--no-notify",
        action="store_true",
        help="Scrape and save new grad jobs without sending Slack notifications"
    )
    args = parser.parse_args()

    print("🚀 Starting JobNotifier Dedicated New Grad Monitor...", flush=True)
    run_monitor(NEWGRAD_SCRAPERS, mode_label="New Grad", notify=not args.no_notify)

if __name__ == "__main__":
    main()
