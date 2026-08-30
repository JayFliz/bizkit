import { db } from "@/db";
import { contactLists, contactListMembers, contacts } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { eq, notInArray } from "drizzle-orm";
import Link from "next/link";
import { addContactToList, removeContactFromList } from "@/actions/marketing";

export default async function ListDetailPage(props: PageProps<"/marketing/lists/[id]">) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await props.params;
  const listId = Number(id);

  const list = db.select().from(contactLists).where(eq(contactLists.id, listId)).get();
  if (!list) notFound();

  const members = db
    .select({
      contactId: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
    })
    .from(contactListMembers)
    .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
    .where(eq(contactListMembers.listId, listId))
    .all();

  const memberIds = members.map((m) => m.contactId);
  const availableContacts =
    memberIds.length > 0
      ? db
          .select()
          .from(contacts)
          .where(notInArray(contacts.id, memberIds))
          .all()
      : db.select().from(contacts).all();

  const addContactAction = async (formData: FormData) => {
    "use server";
    const contactId = Number(formData.get("contactId"));
    if (contactId) await addContactToList(listId, contactId);
  };

  const removeContactAction = async (formData: FormData) => {
    "use server";
    const contactId = Number(formData.get("contactId"));
    if (contactId) await removeContactFromList(listId, contactId);
  };

  return (
    <div className="space-y-6">
      <Link
        href="/marketing/lists"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
      >
        &larr; Back to Lists
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {list.name}
        </h1>
        {list.description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {list.description}
          </p>
        )}
      </div>

      {availableContacts.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Add Contact
          </h2>
          <form action={addContactAction} className="flex items-end gap-3">
            <div className="flex-1">
              <select
                name="contactId"
                required
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Select a contact</option>
                {availableContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
            >
              Add
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Members ({members.length})
          </h2>
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No contacts in this list yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.contactId}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {member.email ?? "--"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={removeContactAction} className="inline">
                        <input type="hidden" name="contactId" value={member.contactId} />
                        <button
                          type="submit"
                          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
