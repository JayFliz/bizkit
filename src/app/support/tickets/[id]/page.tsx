import { db } from "@/db";
import {
  tickets,
  ticketComments,
  ticketActivity,
  contacts,
  companies,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { TicketActions } from "./ticket-actions";

const statusVariant: Record<string, "warning" | "primary" | "success"> = {
  open: "warning",
  in_progress: "primary",
  closed: "success",
};

export default async function TicketDetailPage(
  props: PageProps<"/support/tickets/[id]">
) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await props.params;
  const ticketId = Number(id);

  const ticket = db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
  }).sync();
  if (!ticket) notFound();

  const company = ticket.companyId
    ? db.query.companies.findFirst({
        where: eq(companies.id, ticket.companyId),
      }).sync()
    : null;

  const contact = ticket.contactId
    ? db.query.contacts.findFirst({
        where: eq(contacts.id, ticket.contactId),
      }).sync()
    : null;

  const assignee = ticket.assignedTo
    ? db.query.users.findFirst({
        where: eq(users.id, ticket.assignedTo),
      }).sync()
    : null;

  const allUsers = db.query.users.findMany({
    columns: { id: true, name: true },
    orderBy: (u, { asc }) => [asc(u.name)],
  }).sync();

  const comments = db
    .select({
      id: ticketComments.id,
      body: ticketComments.body,
      createdAt: ticketComments.createdAt,
      authorName: users.name,
    })
    .from(ticketComments)
    .leftJoin(users, eq(ticketComments.authorId, users.id))
    .where(eq(ticketComments.ticketId, ticketId))
    .orderBy(ticketComments.createdAt)
    .all();

  const activity = db
    .select({
      id: ticketActivity.id,
      action: ticketActivity.action,
      oldValue: ticketActivity.oldValue,
      newValue: ticketActivity.newValue,
      createdAt: ticketActivity.createdAt,
      actorName: users.name,
    })
    .from(ticketActivity)
    .leftJoin(users, eq(ticketActivity.actorId, users.id))
    .where(eq(ticketActivity.ticketId, ticketId))
    .orderBy(ticketActivity.createdAt)
    .all();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/support/tickets"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Tickets
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {ticket.subject}
          </h1>
          <Badge variant={statusVariant[ticket.status]}>
            {ticket.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {ticket.ticketNumber}
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 text-sm">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Contact</dt>
            <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {contact
                ? `${contact.firstName} ${contact.lastName}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Company</dt>
            <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {company?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
            <dd className="mt-1">
              <Badge variant={statusVariant[ticket.status]}>
                {ticket.status.replace(/_/g, " ")}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Assigned To</dt>
            <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {assignee?.name ?? "Unassigned"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Created</dt>
            <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {formatDate(ticket.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Ticket body */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Description
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
          {ticket.body}
        </p>
      </div>

      {/* Actions */}
      <TicketActions
        ticketId={ticketId}
        status={ticket.status}
        assignedTo={ticket.assignedTo}
        allUsers={allUsers}
      />

      {/* Comments */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Comments
        </h2>

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-zinc-100 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {c.authorName ?? "Unknown"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(c.createdAt)}
                  </p>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No comments yet</p>
        )}

        {/* Add comment form */}
        <form
          action={async (formData: FormData) => {
            "use server";
            const { addComment } = await import("@/actions/support");
            await addComment(ticketId, formData);
          }}
          className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3"
        >
          <textarea
            name="body"
            rows={3}
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="Add a comment..."
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
            >
              Add Comment
            </button>
          </div>
        </form>
      </div>

      {/* Activity log */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Activity Log
        </h2>

        {activity.length > 0 ? (
          <div className="space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <div className="flex-1">
                  <p className="text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {a.actorName ?? "Unknown"}
                    </span>{" "}
                    {formatAction(a.action, a.oldValue, a.newValue)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No activity recorded</p>
        )}
      </div>
    </div>
  );
}

function formatAction(
  action: string,
  oldValue: string | null,
  newValue: string | null
): string {
  switch (action) {
    case "created":
      return "created this ticket";
    case "status_change":
      return `changed status from ${(oldValue ?? "unknown").replace(/_/g, " ")} to ${(newValue ?? "unknown").replace(/_/g, " ")}`;
    case "assigned":
      return `assigned this ticket to ${newValue ?? "someone"}`;
    case "comment_added":
      return "added a comment";
    default:
      return action.replace(/_/g, " ");
  }
}
