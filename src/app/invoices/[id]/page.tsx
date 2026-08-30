import { db } from "@/db";
import {
  invoices,
  invoiceLineItems,
  payments,
  companies,
  contacts,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { InvoiceActions } from "./invoice-actions";

const statusVariant: Record<
  string,
  "default" | "warning" | "info" | "success" | "danger"
> = {
  draft: "default",
  issued: "warning",
  partially_paid: "info",
  paid: "success",
  cancelled: "danger",
};

export default async function InvoiceDetailPage(
  props: PageProps<"/invoices/[id]">
) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await props.params;
  const invoiceId = Number(id);

  const invoice = db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  }).sync();
  if (!invoice) notFound();

  const company = invoice.companyId
    ? db.query.companies.findFirst({
        where: eq(companies.id, invoice.companyId),
      }).sync()
    : null;

  const contact = invoice.contactId
    ? db.query.contacts.findFirst({
        where: eq(contacts.id, invoice.contactId),
      }).sync()
    : null;

  const lineItems = db.query.invoiceLineItems.findMany({
    where: eq(invoiceLineItems.invoiceId, invoiceId),
  }).sync();

  const invoicePayments = db.query.payments.findMany({
    where: eq(payments.invoiceId, invoiceId),
    orderBy: (p, { desc }) => [desc(p.paidAt)],
  }).sync();

  const total = lineItems.reduce(
    (sum: number, li) => sum + li.quantity * li.unitPrice,
    0
  );

  const totalPaid = invoicePayments.reduce((sum: number, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Invoices
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {invoice.reference}
            </h1>
            <Badge variant={statusVariant[invoice.status]}>
              {invoice.status.replace(/_/g, " ")}
            </Badge>
          </div>
          {company && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {company.name}
            </p>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 text-sm">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Company</dt>
            <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {company?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Contact</dt>
            <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {contact
                ? `${contact.firstName} ${contact.lastName}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Due Date</dt>
            <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Created</dt>
            <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {formatDate(invoice.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
            <dd className="mt-1">
              <Badge variant={statusVariant[invoice.status]}>
                {invoice.status.replace(/_/g, " ")}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>

      {/* Line items table */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Qty</th>
              <th className="px-4 py-3 font-medium text-right">Unit Price</th>
              <th className="px-4 py-3 font-medium text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li) => (
              <tr
                key={li.id}
                className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                  {li.description}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                  {li.quantity}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(li.unitPrice)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(li.quantity * li.unitPrice)}
                </td>
              </tr>
            ))}
            {lineItems.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-zinc-400"
                >
                  No line items
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td
                colSpan={3}
                className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Total
              </td>
              <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payments section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Payments
        </h2>
        {invoicePayments.length > 0 ? (
          <div className="space-y-2">
            {invoicePayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(p.amount)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {p.method ? p.method.replace(/_/g, " ") : "—"}
                    {p.reference && ` · ${p.reference}`}
                  </p>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(p.paidAt)}
                </p>
              </div>
            ))}
            <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                Total paid
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {formatCurrency(totalPaid)} / {formatCurrency(total)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No payments recorded</p>
        )}
      </div>

      {/* Actions */}
      <InvoiceActions
        invoiceId={invoiceId}
        status={invoice.status}
        outstanding={total - totalPaid}
      />
    </div>
  );
}
