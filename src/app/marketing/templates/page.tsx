import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/utils";
import { createTemplate } from "@/actions/marketing";

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const templates = db
    .select()
    .from(emailTemplates)
    .orderBy(desc(emailTemplates.updatedAt))
    .all();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description="Create and manage email templates for your campaigns."
        actions={
          <details className="relative">
            <summary className="cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium list-none">
              New Template
            </summary>
            <form
              action={createTemplate}
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
                    placeholder="e.g. Monthly Newsletter"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    placeholder="e.g. Your monthly update"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-md px-3 py-1.5 text-sm font-medium"
                >
                  Create Template
                </button>
              </div>
            </form>
          </details>
        }
      />

      {templates.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No templates yet. Create your first email template to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/marketing/templates/${template.id}`}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                {template.name}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                {template.subject}
              </p>
              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                Updated {formatDate(template.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
