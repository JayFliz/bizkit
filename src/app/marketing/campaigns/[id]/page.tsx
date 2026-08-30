import { db } from "@/db";
import { campaigns, emailTemplates, contactLists, campaignStats } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<string, "default" | "info" | "warning" | "success" | "danger"> = {
  draft: "default",
  scheduled: "info",
  sending: "warning",
  sent: "success",
  failed: "danger",
};

export default async function CampaignDetailPage(props: PageProps<"/marketing/campaigns/[id]">) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await props.params;
  const campaignId = Number(id);

  const campaign = db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      templateName: emailTemplates.name,
      listName: contactLists.name,
      sentAt: campaigns.sentAt,
      createdAt: campaigns.createdAt,
    })
    .from(campaigns)
    .leftJoin(emailTemplates, eq(campaigns.templateId, emailTemplates.id))
    .leftJoin(contactLists, eq(campaigns.listId, contactLists.id))
    .where(eq(campaigns.id, campaignId))
    .get();

  if (!campaign) notFound();

  const stats = db
    .select()
    .from(campaignStats)
    .where(eq(campaignStats.campaignId, campaignId))
    .get();

  const deliveryRate = stats && stats.sent ? ((stats.delivered ?? 0) / stats.sent * 100) : 0;
  const openRate = stats && stats.delivered ? ((stats.opened ?? 0) / stats.delivered * 100) : 0;
  const clickRate = stats && stats.opened ? ((stats.clicked ?? 0) / stats.opened * 100) : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/marketing/campaigns"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
      >
        &larr; Back to Campaigns
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {campaign.name}
        </h1>
        <Badge variant={statusVariant[campaign.status] ?? "default"}>
          {campaign.status}
        </Badge>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
          Campaign Details
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-400 dark:text-zinc-500">Template</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {campaign.templateName ?? "--"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400 dark:text-zinc-500">Contact List</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {campaign.listName ?? "--"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400 dark:text-zinc-500">Created</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {formatDate(campaign.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400 dark:text-zinc-500">Sent At</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {campaign.sentAt ? formatDate(campaign.sentAt) : "--"}
            </dd>
          </div>
        </dl>
      </div>

      {stats && (stats.sent ?? 0) > 0 && (
        <>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Campaign Statistics
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Sent</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.sent}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Delivered</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.delivered}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{deliveryRate.toFixed(1)}% rate</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Opened</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.opened}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{openRate.toFixed(1)}% rate</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Clicked</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.clicked}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{clickRate.toFixed(1)}% rate</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Bounced</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {stats.bounced}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
