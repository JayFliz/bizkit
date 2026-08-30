"use client";

import { useState } from "react";
import { sendCampaign } from "@/actions/marketing";

export function SendCampaignButton({ campaignId }: { campaignId: number }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!confirm("Send this campaign to all contacts in the list?")) return;
    setSending(true);
    setError(null);
    try {
      await sendCampaign(campaignId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSend}
        disabled={sending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send Campaign"}
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
