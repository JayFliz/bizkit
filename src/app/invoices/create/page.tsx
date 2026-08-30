import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { InvoiceForm } from "./invoice-form";

export default async function CreateInvoicePage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const companies = db.query.companies.findMany({
    columns: { id: true, name: true },
    orderBy: (c, { asc }) => [asc(c.name)],
  }).sync();

  const contacts = db.query.contacts.findMany({
    columns: { id: true, firstName: true, lastName: true, companyId: true },
    orderBy: (c, { asc }) => [asc(c.firstName)],
  }).sync();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Invoice"
        actions={
          <Link
            href="/invoices"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            Cancel
          </Link>
        }
      />
      <InvoiceForm companies={companies} contacts={contacts} />
    </div>
  );
}
