import { db } from "@/db";
import { tickets, contacts, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<string, "warning" | "primary" | "success"> = {
  open: "warning",
  in_progress: "primary",
  closed: "success",
};

const statuses = ["all", "open", "in_progress", "closed"] as const;

export default async function TicketsPage(
  props: PageProps<"/support/tickets">
) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const sp = await props.searchParams;
  const statusFilter = typeof sp?.status === "string" ? sp.status : "all";

  const rows = db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      createdAt: tickets.createdAt,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      assignedName: users.name,
    })
    .from(tickets)
    .leftJoin(contacts, eq(tickets.contactId, contacts.id))
    .leftJoin(users, eq(tickets.assignedTo, users.id))
    .where(
      statusFilter !== "all"
        ? eq(
            tickets.status,
            statusFilter as typeof tickets.$inferSelect.status
          )
        : undefined
    )
    .orderBy(sql`tickets.created_at desc`)
    .all();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        actions={
          <Link
            href="/support/tickets/new"
            className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
          >
            New Ticket
          </Link>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {statuses.map((s) => (
          <Link
            key={s}
            href={
              s === "all"
                ? "/support/tickets"
                : `/support/tickets?status=${s}`
            }
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === s
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            {s === "all"
              ? "All"
              : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Ticket #</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Assigned To</th>
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
                    href={`/support/tickets/${row.id}`}
                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                  >
                    {row.ticketNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                  <Link href={`/support/tickets/${row.id}`}>
                    {row.subject}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[row.status]}>
                    {row.status.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {row.contactFirstName
                    ? `${row.contactFirstName} ${row.contactLastName}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {row.assignedName ?? "Unassigned"}
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
                  No tickets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
