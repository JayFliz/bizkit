"use client";

import { useState } from "react";
import { createInvoice } from "@/actions/invoices";

type Company = { id: number; name: string };
type Contact = {
  id: number;
  firstName: string;
  lastName: string;
  companyId: number | null;
};

interface LineItem {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

let nextKey = 1;

function newLine(): LineItem {
  return { key: nextKey++, description: "", quantity: "1", unitPrice: "" };
}

export function InvoiceForm({
  companies,
  contacts,
}: {
  companies: Company[];
  contacts: Contact[];
}) {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([newLine()]);

  const filteredContacts = selectedCompany
    ? contacts.filter((c) => c.companyId === Number(selectedCompany))
    : contacts;

  const total = lineItems.reduce(
    (sum, li) =>
      sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
    0
  );

  function updateLine(key: number, field: keyof LineItem, value: string) {
    setLineItems((items) =>
      items.map((li) => (li.key === key ? { ...li, [field]: value } : li))
    );
  }

  function removeLine(key: number) {
    setLineItems((items) => items.filter((li) => li.key !== key));
  }

  return (
    <form action={createInvoice} className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Company
            </label>
            <select
              name="companyId"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">Select company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Contact
            </label>
            <select
              name="contactId"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">Select contact...</option>
              {filteredContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              name="dueDate"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="Optional notes..."
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Line Items
          </h2>
          <button
            type="button"
            onClick={() => setLineItems((items) => [...items, newLine()])}
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
          >
            + Add Line
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((li, idx) => (
            <div
              key={li.key}
              className="grid grid-cols-[1fr_80px_100px_32px] gap-3 items-end"
            >
              <div>
                {idx === 0 && (
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Description
                  </label>
                )}
                <input
                  name="lineDescription"
                  value={li.description}
                  onChange={(e) =>
                    updateLine(li.key, "description", e.target.value)
                  }
                  placeholder="Description"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  required
                />
              </div>
              <div>
                {idx === 0 && (
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Qty
                  </label>
                )}
                <input
                  name="lineQuantity"
                  type="number"
                  min="0"
                  step="any"
                  value={li.quantity}
                  onChange={(e) =>
                    updateLine(li.key, "quantity", e.target.value)
                  }
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  required
                />
              </div>
              <div>
                {idx === 0 && (
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Unit Price
                  </label>
                )}
                <input
                  name="linePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={li.unitPrice}
                  onChange={(e) =>
                    updateLine(li.key, "unitPrice", e.target.value)
                  }
                  placeholder="0.00"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  required
                />
              </div>
              <div>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(li.key)}
                    className="flex h-[38px] w-8 items-center justify-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    aria-label="Remove line"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <div className="text-right">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {new Intl.NumberFormat("en-GB", {
                style: "currency",
                currency: "GBP",
              }).format(total)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-4 py-2 text-sm font-medium"
        >
          Create Invoice
        </button>
      </div>
    </form>
  );
}
