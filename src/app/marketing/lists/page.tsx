import { db } from "@/db";
import { contactLists, contactListMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { desc, eq, count } from "drizzle-orm";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/utils";
import { createList } from "@/actions/marketing";

export default async function ListsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const lists = db
    .select({
      id: contactLists.id,
      name: contactLists.name,
      description: contactLists.description,
      createdAt: contactLists.createdAt,
      memberCount: count(contactListMembers.id),
    })
    .from(contactLists)
    .leftJoin(contactListMembers, eq(contactLists.id, contactListMembers.listId))
    .groupBy(contactLists.id)
    .orderBy(desc(contactLists.createdAt))
    .all();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact Lists"
        description="Organize your contacts into lists for targeted campaigns."
        actions={
          <details className="relative">
            <summary className="cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium list-none">
              New List
            </summary>
            <form
              action={createList}
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
                    placeholder="e.g. VIP Customers"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    placeholder="Optional description"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
                >
                  Create List
                </button>
              </div>
            </form>
          </details>
        }
      />

      {lists.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No contact lists yet. Create your first list to organize your contacts.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/marketing/lists/${list.id}`}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                {list.name}
              </h3>
              {list.description && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {list.description}
                </p>
              )}
              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                {list.memberCount} {list.memberCount === 1 ? "contact" : "contacts"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
