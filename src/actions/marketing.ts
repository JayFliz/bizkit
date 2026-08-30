"use server";

import { db } from "@/db";
import {
  emailTemplates,
  campaigns,
  contactLists,
  contactListMembers,
  campaignStats,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTemplate(formData: FormData) {
  await requireAuth();
  const result = db
    .insert(emailTemplates)
    .values({
      name: formData.get("name") as string,
      subject: formData.get("subject") as string,
      content: JSON.stringify([
        { type: "heading", content: "Your heading here" },
        { type: "text", content: "Start writing your email..." },
      ]),
    })
    .run();
  revalidatePath("/marketing/templates");
  redirect(`/marketing/templates/${result.lastInsertRowid}`);
}

export async function updateTemplate(
  id: number,
  data: { name?: string; subject?: string; content?: string }
) {
  await requireAuth();
  const update: Record<string, unknown> = {};
  if (data.name) update.name = data.name;
  if (data.subject) update.subject = data.subject;
  if (data.content) update.content = data.content;

  db.update(emailTemplates)
    .set(update)
    .where(eq(emailTemplates.id, id))
    .run();
  revalidatePath(`/marketing/templates/${id}`);
  revalidatePath("/marketing/templates");
}

export async function createCampaign(formData: FormData) {
  await requireAuth();
  const result = db
    .insert(campaigns)
    .values({
      name: formData.get("name") as string,
      templateId: formData.get("templateId")
        ? Number(formData.get("templateId"))
        : undefined,
      listId: formData.get("listId")
        ? Number(formData.get("listId"))
        : undefined,
      status: "draft",
    })
    .run();

  const campaignId = Number(result.lastInsertRowid);
  db.insert(campaignStats).values({ campaignId }).run();

  revalidatePath("/marketing/campaigns");
  redirect(`/marketing/campaigns/${campaignId}`);
}

export async function createList(formData: FormData) {
  await requireAuth();
  const result = db
    .insert(contactLists)
    .values({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
    })
    .run();
  revalidatePath("/marketing/lists");
  redirect(`/marketing/lists/${result.lastInsertRowid}`);
}

export async function addContactToList(listId: number, contactId: number) {
  await requireAuth();
  db.insert(contactListMembers).values({ listId, contactId }).run();
  revalidatePath(`/marketing/lists/${listId}`);
}

export async function removeContactFromList(listId: number, contactId: number) {
  await requireAuth();
  const { and } = await import("drizzle-orm");
  db.delete(contactListMembers)
    .where(
      and(
        eq(contactListMembers.listId, listId),
        eq(contactListMembers.contactId, contactId)
      )
    )
    .run();
  revalidatePath(`/marketing/lists/${listId}`);
}
