import { db } from "@/db";
import { contacts, companies, activities, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { logActivity } from "@/actions/crm";

export default async function ContactDetailPage(
  props: PageProps<"/crm/contacts/[id]">
) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await props.params;

  const contact = db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
      companyId: contacts.companyId,
      companyName: companies.name,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.id, Number(id)))
    .get();

  if (!contact) notFound();

  const activityList = db
    .select({
      id: activities.id,
      type: activities.type,
      subject: activities.subject,
      body: activities.body,
      date: activities.date,
      userName: users.name,
    })
    .from(activities)
    .leftJoin(users, eq(activities.userId, users.id))
    .where(eq(activities.contactId, contact.id))
    .orderBy(activities.date)
    .all()
    .reverse();

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
        href="/crm/contacts"
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
        Back to Contacts
      </Link>

      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={[contact.title, contact.companyName]
          .filter(Boolean)
          .join(" at ")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact Info Card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
            Contact Information
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Email
              </dt>
              <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    {contact.email}
                  </a>
                ) : (
                  <span className="text-zinc-400">Not set</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Phone
              </dt>
              <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                {contact.phone || (
                  <span className="text-zinc-400">Not set</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Company
              </dt>
              <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                {contact.companyId ? (
                  <Link
                    href={`/crm/companies/${contact.companyId}`}
                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    {contact.companyName}
                  </Link>
                ) : (
                  <span className="text-zinc-400">No company</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Title
              </dt>
              <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                {contact.title || (
                  <span className="text-zinc-400">Not set</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Added
              </dt>
              <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                {formatDate(contact.createdAt)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
              Activity Timeline
            </h2>

            {activityList.length > 0 ? (
              <div className="space-y-4">
                {activityList.map((activity) => (
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
                        {activity.userName} &middot;{" "}
                        {formatDateTime(activity.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No activities yet.</p>
            )}
          </div>

          {/* Log Activity Form */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
              Log Activity
            </h2>
            <form action={logActivity} className="space-y-4">
              <input type="hidden" name="contactId" value={contact.id} />
              {contact.companyId && (
                <input
                  type="hidden"
                  name="companyId"
                  value={contact.companyId}
                />
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Type
                  </label>
                  <select
                    name="type"
                    required
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="note">Note</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Date
                  </label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Subject
                </label>
                <input
                  name="subject"
                  required
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Notes
                </label>
                <textarea
                  name="body"
                  rows={3}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Log Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
