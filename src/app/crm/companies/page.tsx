import { db } from "@/db";
import { companies, contacts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { createCompany } from "@/actions/crm";
import { NewCompanyDialog } from "./new-company-dialog";

export default async function CompaniesPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const rows = db
    .select({
      id: companies.id,
      name: companies.name,
      sector: companies.sector,
      city: companies.city,
      website: companies.website,
      contactCount: sql<number>`count(${contacts.id})`,
    })
    .from(companies)
    .leftJoin(contacts, eq(contacts.companyId, companies.id))
    .groupBy(companies.id)
    .orderBy(companies.name)
    .all();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description={`${rows.length} ${rows.length === 1 ? "company" : "companies"}`}
        actions={<NewCompanyDialog />}
      />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Website</th>
              <th className="px-4 py-3 text-right">Contacts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/crm/companies/${row.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.sector ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.city ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.website ? (
                    <a
                      href={
                        row.website.startsWith("http")
                          ? row.website
                          : `https://${row.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      {row.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                  {row.contactCount}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  No companies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
