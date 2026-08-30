import { db } from "@/db";
import { campaigns, emailTemplates, contactLists } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { createCampaign } from "@/actions/marketing";

const statusVariant: Record<string, "default" | "info" | "warning" | "success" | "danger"> = {
  draft: "default",
  scheduled: "info",
  sending: "warning",
  sent: "success",
  failed: "danger",
};

export default async function CampaignsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const allCampaigns = db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      templateId: campaigns.templateId,
      templateName: emailTemplates.name,
      listId: campaigns.listId,
      listName: contactLists.name,
      sentAt: campaigns.sentAt,
      createdAt: campaigns.createdAt,
    })
    .from(campaigns)
    .leftJoin(emailTemplates, eq(campaigns.templateId, emailTemplates.id))
    .leftJoin(contactLists, eq(campaigns.listId, contactLists.id))
    .orderBy(desc(campaigns.createdAt))
    .all();

  const templates = db.select().from(emailTemplates).all();
  const lists = db.select().from(contactLists).all();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Send targeted email campaigns to your contact lists."
        actions={
          <details className="relative">
            <summary className="cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium list-none">
              New Campaign
            </summary>
            <form
              action={createCampaign}
              className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 z-10"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Summer Sale Blast"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Template
                  </label>
                  <select
                    name="templateId"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="">Select a template</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Contact List
                  </label>
                  <select
                    name="listId"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="">Select a list</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </details>
        }
      />

      {allCampaigns.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No campaigns yet. Create your first campaign to start sending emails.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Template</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">List</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Sent</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Created</th>
              </tr>
            </thead>
            <tbody>
              {allCampaigns.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/marketing/campaigns/${c.id}`}
                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[c.status] ?? "default"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {c.templateName ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {c.listName ?? "--"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {c.sentAt ? formatDate(c.sentAt) : "--"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDate(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
