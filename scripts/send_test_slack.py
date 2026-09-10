#!/usr/bin/env python3
"""
JobNotifier Slack Test Notification Script
Sends a single formatted test notification to Slack to verify webhook connectivity and formatting.
"""
import os
import sys
import requests
from dotenv import load_dotenv

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(root_dir, ".env"))

WEBHOOKS = {
    "Canada Internships": os.environ.get("SLACK_WEBHOOK_CANADA"),
    "USA Internships": os.environ.get("SLACK_WEBHOOK_USA"),
    "Canada New Grad": os.environ.get("SLACK_WEBHOOK_NEWGRAD_CANADA"),
    "USA New Grad": os.environ.get("SLACK_WEBHOOK_NEWGRAD_USA"),
    "Default / General": os.environ.get("SLACK_WEBHOOK_URL"),
}

def send_test(channel_name, webhook_url):
    if not webhook_url:
        print(f"⚠️  [{channel_name}] Webhook URL NOT configured in .env.")
        return False

    payload = {
        "text": (
            f"🧪 *[TEST MESSAGE] JobNotifier Integration Verification*\n"
            f"📍 *Target Channel:* {channel_name}\n"
            f"🚀 *Status:* Webhook connectivity verified successfully.\n"
            f"💼 *Sample Role:* 🏢 *Google* — Software Engineer New Grad — 📍 Toronto, ON / Remote\n"
            f"   🔗 <https://google.com/about/careers|Apply Link>\n"
            f"   📋 _Source: Test Bot_"
        )
    }

    try:
        res = requests.post(webhook_url, json=payload, timeout=10)
        if res.status_code == 200:
            print(f"✅ [{channel_name}] Test message delivered successfully! (HTTP 200)")
            return True
        else:
            print(f"❌ [{channel_name}] Failed to send: HTTP {res.status_code} - {res.text}")
            return False
    except Exception as e:
        print(f"❌ [{channel_name}] Error: {e}")
        return False

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    print("=" * 60)
    print(" JobNotifier: Slack Webhook Test Dispatcher")
    print("=" * 60)

    for name, url in WEBHOOKS.items():
        if target.lower() != "all" and target.lower() not in name.lower():
            continue
        send_test(name, url)

if __name__ == "__main__":
    main()
