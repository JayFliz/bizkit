import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { TemplateEditor } from "./template-editor";

export default async function TemplateDetailPage(props: PageProps<"/marketing/templates/[id]">) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await props.params;
  const templateId = Number(id);

  const template = db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.id, templateId))
    .get();

  if (!template) notFound();

  const blocks = Array.isArray(template.content)
    ? (template.content as Block[])
    : JSON.parse(template.content as string) as Block[];

  return (
    <div className="space-y-6">
      <Link
        href="/marketing/templates"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
      >
        &larr; Back to Templates
      </Link>

      <TemplateEditor
        templateId={templateId}
        initialName={template.name}
        initialSubject={template.subject}
        initialBlocks={blocks}
      />
    </div>
  );
}

type Block = {
  type: "heading" | "text" | "button" | "image" | "divider";
  content?: string;
  url?: string;
  alt?: string;
};
