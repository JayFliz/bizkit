import { db } from "@/db";
import { opportunities, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PipelineBoard } from "./pipeline-board";
import { NewOpportunityDialog } from "./new-opportunity-dialog";

const STAGES = [
  "identified",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export default async function PipelinePage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const rows = db
    .select({
      id: opportunities.id,
      name: opportunities.name,
      stage: opportunities.stage,
      value: opportunities.value,
      companyName: companies.name,
    })
    .from(opportunities)
    .leftJoin(companies, eq(opportunities.companyId, companies.id))
    .orderBy(opportunities.createdAt)
    .all();

  const companyList = db.query.companies
    .findMany({
      columns: { id: true, name: true },
      orderBy: (c, { asc }) => [asc(c.name)],
    })
    .sync();

  const contactList = db.query.contacts
    .findMany({
      columns: { id: true, firstName: true, lastName: true },
      orderBy: (c, { asc }) => [asc(c.lastName)],
    })
    .sync();

  const columns = STAGES.map((stage) => ({
    stage,
    items: rows.filter((r) => r.stage === stage),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description={`${rows.length} opportunities`}
        actions={
          <NewOpportunityDialog
            companies={companyList}
            contacts={contactList}
          />
        }
      />

      <PipelineBoard columns={columns} />
    </div>
  );
}
