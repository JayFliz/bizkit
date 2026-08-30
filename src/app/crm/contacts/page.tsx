import { db } from "@/db";
import { contacts, companies } from "@/db/schema";
import { eq, like, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { createContact } from "@/actions/crm";
import { ContactsSearch } from "./contacts-search";
import { NewContactDialog } from "./new-contact-dialog";

export default async function ContactsPage(props: PageProps<"/crm/contacts">) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";

  const companyList = db.query.companies
    .findMany({
      columns: { id: true, name: true },
      orderBy: (c, { asc }) => [asc(c.name)],
    })
    .sync();

  const rows = db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(
      q
        ? or(
            like(contacts.firstName, `%${q}%`),
            like(contacts.lastName, `%${q}%`),
            like(contacts.email, `%${q}%`)
          )
        : undefined
    )
    .orderBy(contacts.lastName, contacts.firstName)
    .all();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description={`${rows.length} contact${rows.length !== 1 ? "s" : ""}`}
        actions={<NewContactDialog companies={companyList} />}
      />

      <ContactsSearch defaultValue={q} />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Title</th>
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
                    href={`/crm/contacts/${row.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    {row.firstName} {row.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.phone ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.companyName ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.title ?? "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  {q ? "No contacts match your search." : "No contacts yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
