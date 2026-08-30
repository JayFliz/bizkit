"use client";

import { useState } from "react";
import { transitionInvoice, recordPayment } from "@/actions/invoices";

export function InvoiceActions({
  invoiceId,
  status,
  outstanding,
}: {
  invoiceId: number;
  status: string;
  outstanding: number;
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const canIssue = status === "draft";
  const canRecordPayment = status === "issued" || status === "partially_paid";
  const canCancel = status === "draft" || status === "issued";

  if (!canIssue && !canRecordPayment && !canCancel) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
        Actions
      </h2>

      <div className="flex flex-wrap gap-2">
        {canIssue && (
          <button
            onClick={() => transitionInvoice(invoiceId, "issued")}
            className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
          >
            Issue Invoice
          </button>
        )}

        {canRecordPayment && (
          <button
            onClick={() => setShowPaymentForm((v) => !v)}
            className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
          >
            Record Payment
          </button>
        )}

        {canCancel && (
          <button
            onClick={() => transitionInvoice(invoiceId, "cancelled")}
            className="bg-red-600 text-white hover:bg-red-700 rounded-md px-3 py-1.5 text-sm font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      {showPaymentForm && (
        <form
          action={async (formData) => {
            await recordPayment(invoiceId, formData);
            setShowPaymentForm(false);
          }}
          className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4"
        >
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Record Payment
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Amount
              </label>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={outstanding > 0 ? outstanding.toFixed(2) : ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Method
              </label>
              <select
                name="method"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Reference
              </label>
              <input
                name="reference"
                type="text"
                placeholder="Optional"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
            >
              Submit Payment
            </button>
            <button
              type="button"
              onClick={() => setShowPaymentForm(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
