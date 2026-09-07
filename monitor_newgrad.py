"""
JobNotifier Dedicated New Grad Monitor
Polls all New Grad sources (SimplifyJobs-NewGrad, SpeedyApply-SWE-NewGrad, SpeedyApply-AI-NewGrad)
and dispatches real-time alerts strictly to #new-grad-canada and #new-grad-usa.
"""
from monitor import run_monitor
from scrapers import NEWGRAD_SCRAPERS

def main():
    print("🚀 Starting JobNotifier Dedicated New Grad Monitor...", flush=True)
    run_monitor(NEWGRAD_SCRAPERS, mode_label="New Grad")

if __name__ == "__main__":
    main()
