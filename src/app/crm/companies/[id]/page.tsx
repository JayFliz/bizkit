import { db } from "@/db";
import {
  companies,
  contacts,
  opportunities,
  activities,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default async function CompanyDetailPage(
  props: PageProps<"/crm/companies/[id]">
) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await props.params;

  const company = db.query.companies
    .findFirst({
      where: eq(companies.id, Number(id)),
    })
    .sync();

  if (!company) notFound();

  const companyContacts = db.query.contacts
    .findMany({
      where: eq(contacts.companyId, company.id),
      orderBy: (c, { asc }) => [asc(c.lastName), asc(c.firstName)],
    })
    .sync();

  const companyOpps = db
    .select({
      id: opportunities.id,
      name: opportunities.name,
      stage: opportunities.stage,
      value: opportunities.value,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
    })
    .from(opportunities)
    .leftJoin(contacts, eq(opportunities.contactId, contacts.id))
    .where(eq(opportunities.companyId, company.id))
    .orderBy(opportunities.createdAt)
    .all()
    .reverse();

  const recentActivities = db
    .select({
      id: activities.id,
      type: activities.type,
      subject: activities.subject,
      body: activities.body,
      date: activities.date,
      userName: users.name,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
    })
    .from(activities)
    .leftJoin(users, eq(activities.userId, users.id))
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .where(eq(activities.companyId, company.id))
    .orderBy(activities.date)
    .all()
    .reverse()
    .slice(0, 10);

  const stageColors: Record<
    string,
    "primary" | "warning" | "success" | "danger" | "info" | "default"
  > = {
    identified: "default",
    qualified: "info",
    proposal: "primary",
    negotiation: "warning",
    won: "success",
    lost: "danger",
  };

  const typeColors: Record<
    string,
    "primary" | "success" | "warning" | "info"
  > = {
    email: "primary",
    call: "success",
    meeting: "warning",
    note: "info",
  };

  return (
    <div className="space-y-6">
      <Link
        href="/crm/companies"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Companies
      </Link>

      <PageHeader
        title={company.name}
        description={[company.sector, company.city]
          .filter(Boolean)
          .join(" · ")}
      />

      {/* Contacts Section */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Contacts ({companyContacts.length})
          </h2>
        </div>

        {companyContacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {companyContacts.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/crm/contacts/${c.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {c.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {c.phone ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {c.title ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">
            No contacts linked to this company.
          </p>
        )}
      </section>

      {/* Opportunities Section */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Opportunities ({companyOpps.length})
          </h2>
        </div>

        {companyOpps.length > 0 ? (
          <div className="space-y-3">
            {companyOpps.map((opp) => (
              <div
                key={opp.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {opp.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatCurrency(opp.value ?? 0)}
                    {opp.contactFirstName &&
                      ` · ${opp.contactFirstName} ${opp.contactLastName}`}
                  </p>
                </div>
                <Badge variant={stageColors[opp.stage]}>{opp.stage}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No opportunities yet.</p>
        )}
      </section>

      {/* Recent Activity Section */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Activity
        </h2>

        {recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <div className="mt-0.5 shrink-0">
                  <Badge variant={typeColors[activity.type]}>
                    {activity.type}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {activity.subject}
                  </p>
                  {activity.body && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {activity.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    {activity.userName}
                    {activity.contactFirstName &&
                      ` · ${activity.contactFirstName} ${activity.contactLastName}`}
                    {" · "}
                    {formatDateTime(activity.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No activity recorded.</p>
        )}
      </section>
    </div>
  );
}
