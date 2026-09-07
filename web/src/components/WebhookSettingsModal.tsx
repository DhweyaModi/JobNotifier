"use client";

import React, { useState } from "react";
import { Settings, Bell, CheckCircle, Send, ShieldCheck, AlertCircle } from "lucide-react";

export const WebhookSettingsModal: React.FC = () => {
  const [canadaWebhook, setCanadaWebhook] = useState(
    process.env.NEXT_PUBLIC_SLACK_WEBHOOK_CANADA || ""
  );
  const [usaWebhook, setUsaWebhook] = useState(
    process.env.NEXT_PUBLIC_SLACK_WEBHOOK_USA || ""
  );
  const [otherWebhook, setOtherWebhook] = useState(
    process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL || ""
  );

  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleTestNotification = async (channel: string, url: string) => {
    if (!url) {
      setTestMessage(`Please enter a valid webhook URL for ${channel} channel.`);
      return;
    }

    setIsSending(true);
    setTestMessage(null);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🔔 *[TEST] JobNotifier Notification Test for ${channel} Channel!*\nFilter Verification: Successful.`,
        }),
      });

      if (res.ok) {
        setTestMessage(`✅ Test notification sent successfully to ${channel} channel!`);
      } else {
        setTestMessage(`⚠️ Error sending test notification (HTTP ${res.status}). Check webhook URL.`);
      }
    } catch (err: any) {
      setTestMessage(`❌ Failed to send: ${err.message || String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Webhook & Filter Channels Configuration</h2>
            <p className="text-xs text-slate-400">
              Manage Slack and Discord webhook endpoints for Canada, USA, and International notification feeds.
            </p>
          </div>
        </div>
      </div>

      {testMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            testMessage.includes("✅")
              ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
              : "bg-amber-950/80 text-amber-300 border-amber-800"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{testMessage}</span>
        </div>
      )}

      {/* Channel Configurations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Canada Channel */}
        <div className="glass-panel p-5 rounded-2xl border-t-4 border-t-red-500 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🇨🇦 Canada Channel</span>
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
              Strict Canada Filter
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Receives jobs located in Canada (Toronto, BC, Waterloo, etc.) and cross-border listings.
          </p>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Slack / Discord Webhook URL
            </label>
            <input
              type="password"
              value={canadaWebhook}
              onChange={(e) => setCanadaWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleTestNotification("Canada 🇨🇦", canadaWebhook)}
            disabled={isSending}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 text-xs font-semibold border border-red-800/60 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Canada Webhook</span>
          </button>
        </div>

        {/* USA Channel */}
        <div className="glass-panel p-5 rounded-2xl border-t-4 border-t-blue-500 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🇺🇸 USA Channel</span>
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              Strict USA Filter
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Receives jobs located in USA (SF, NYC, Seattle, Austin, etc.) and cross-border listings.
          </p>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Slack / Discord Webhook URL
            </label>
            <input
              type="password"
              value={usaWebhook}
              onChange={(e) => setUsaWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleTestNotification("USA 🇺🇸", usaWebhook)}
            disabled={isSending}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 text-xs font-semibold border border-blue-800/60 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test USA Webhook</span>
          </button>
        </div>

        {/* Other Channel */}
        <div className="glass-panel p-5 rounded-2xl border-t-4 border-t-indigo-500 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🌍 Other / International</span>
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              International Filter
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Receives international postings outside North America (e.g. UK, EU, Asia).
          </p>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Slack / Discord Webhook URL
            </label>
            <input
              type="password"
              value={otherWebhook}
              onChange={(e) => setOtherWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleTestNotification("Other 🌍", otherWebhook)}
            disabled={isSending}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 text-xs font-semibold border border-indigo-800/60 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Other Webhook</span>
          </button>
        </div>
      </div>

      <div className="glass-panel p-5 rounded-2xl flex items-center gap-3 border border-emerald-500/30">
        <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-white">GitHub Actions Cron Setup</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Your GitHub Workflow (<code className="text-indigo-300">.github/workflows/job_monitor.yaml</code>) runs every 15 minutes and uses environment secrets <code className="text-cyan-300">SLACK_WEBHOOK_URL_CANADA</code> and <code className="text-cyan-300">SLACK_WEBHOOK_URL_USA</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
