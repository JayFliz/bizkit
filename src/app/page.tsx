import { db } from "@/db";
import { contacts, companies, opportunities, invoices, tickets, campaigns } from "@/db/schema";
import { eq, sql, and, not } from "drizzle-orm";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Dashboard() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const contactCount = db.select({ count: sql<number>`count(*)` }).from(contacts).get()!.count;
  const companyCount = db.select({ count: sql<number>`count(*)` }).from(companies).get()!.count;

  const pipelineValue = db
    .select({ total: sql<number>`coalesce(sum(value), 0)` })
    .from(opportunities)
    .where(
      and(
        not(eq(opportunities.stage, "won")),
        not(eq(opportunities.stage, "lost"))
      )
    )
    .get()!.total;

  const openTickets = db
    .select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(not(eq(tickets.status, "closed")))
    .get()!.count;

  const outstandingInvoices = db
    .select({
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(li.total), 0)`,
    })
    .from(invoices)
    .leftJoin(
      sql`(select invoice_id, sum(quantity * unit_price) as total from invoice_line_items group by invoice_id) li`,
      sql`li.invoice_id = invoices.id`
    )
    .where(eq(invoices.status, "issued"))
    .get()!;

  const activeCampaigns = db
    .select({ count: sql<number>`count(*)` })
    .from(campaigns)
    .where(eq(campaigns.status, "draft"))
    .get()!.count;

  const recentOpps = db.query.opportunities.findMany({
    orderBy: (o, { desc }) => [desc(o.createdAt)],
    limit: 5,
  }).sync();

  const recentTickets = db.query.tickets.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 5,
  }).sync();

  const stageColors: Record<string, "primary" | "warning" | "success" | "danger" | "info" | "default"> = {
    identified: "default",
    qualified: "info",
    proposal: "primary",
    negotiation: "warning",
    won: "success",
    lost: "danger",
  };

  const ticketStatusColors: Record<string, "warning" | "primary" | "success"> = {
    open: "warning",
    in_progress: "primary",
    closed: "success",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Contacts" value={contactCount} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        <StatCard label="Companies" value={companyCount} icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        <StatCard label="Pipeline" value={formatCurrency(pipelineValue)} icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        <StatCard label="Open Tickets" value={openTickets} icon="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        <StatCard label="Unpaid Invoices" value={outstandingInvoices.count} change={formatCurrency(outstandingInvoices.total)} icon="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        <StatCard label="Draft Campaigns" value={activeCampaigns} icon="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Opportunities
            </h2>
            <Link
              href="/crm/pipeline"
              className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentOpps.map((opp) => (
              <div
                key={opp.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {opp.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatCurrency(opp.value ?? 0)}
                  </p>
                </div>
                <Badge variant={stageColors[opp.stage]}>{opp.stage}</Badge>
              </div>
            ))}
            {recentOpps.length === 0 && (
              <p className="text-sm text-zinc-400">No opportunities yet</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Tickets
            </h2>
            <Link
              href="/support/tickets"
              className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/tickets/${ticket.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {ticket.subject}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {ticket.ticketNumber} &middot; {formatDate(ticket.createdAt)}
                  </p>
                </div>
                <Badge variant={ticketStatusColors[ticket.status]}>
                  {ticket.status.replace("_", " ")}
                </Badge>
              </Link>
            ))}
            {recentTickets.length === 0 && (
              <p className="text-sm text-zinc-400">No tickets yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
