import { db } from "@/db";
import { invoices, companies } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

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

const statuses = ["all", "draft", "issued", "partially_paid", "paid", "cancelled"] as const;

export default async function InvoicesPage(props: PageProps<"/invoices">) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const sp = await props.searchParams;
  const statusFilter = typeof sp?.status === "string" ? sp.status : "all";

  const rows = db
    .select({
      id: invoices.id,
      reference: invoices.reference,
      status: invoices.status,
      dueDate: invoices.dueDate,
      createdAt: invoices.createdAt,
      companyName: companies.name,
      total: sql<number>`(select coalesce(sum(quantity * unit_price), 0) from invoice_line_items where invoice_id = invoices.id)`,
    })
    .from(invoices)
    .leftJoin(companies, eq(invoices.companyId, companies.id))
    .where(
      statusFilter !== "all"
        ? eq(invoices.status, statusFilter as typeof invoices.$inferSelect.status)
        : undefined
    )
    .orderBy(sql`invoices.created_at desc`)
    .all();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        actions={
          <Link
            href="/invoices/create"
            className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
          >
            New Invoice
          </Link>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {statuses.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/invoices" : `/invoices?status=${s}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === s
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Due Date</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/invoices/${row.id}`}
                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                  >
                    {row.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {row.companyName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[row.status]}>
                    {row.status.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {row.dueDate ? formatDate(row.dueDate) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(row.total)}
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {formatDate(row.createdAt)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
