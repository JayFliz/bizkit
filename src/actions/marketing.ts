"use server";

import { db } from "@/db";
import {
  emailTemplates,
  campaigns,
  contactLists,
  contactListMembers,
  contacts,
  campaignStats,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";

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

type Block = { type: string; content: string; level?: string; url?: string; alt?: string };

function renderTemplate(blocks: Block[]): string {
  const parts = blocks.map((block) => {
    switch (block.type) {
      case "heading":
        return `<h2 style="margin:0 0 16px;font-size:24px;color:#111">${block.content}</h2>`;
      case "text":
        return `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#333">${block.content}</p>`;
      case "button":
        return `<p style="margin:0 0 16px"><a href="${block.url ?? "#"}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-size:16px">${block.content}</a></p>`;
      case "image":
        return `<img src="${block.url ?? ""}" alt="${block.alt ?? ""}" style="max-width:100%;margin:0 0 16px;border-radius:6px" />`;
      case "divider":
        return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />`;
      default:
        return `<p>${block.content}</p>`;
    }
  });
  return `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:24px">${parts.join("")}</div>`;
}

export async function sendCampaign(campaignId: number) {
  await requireAuth();

  const campaign = db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
  }).sync();
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "draft") throw new Error("Campaign already sent");
  if (!campaign.templateId || !campaign.listId) throw new Error("Campaign needs a template and contact list");

  const template = db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.id, campaign.templateId),
  }).sync();
  if (!template) throw new Error("Template not found");

  const recipients = db
    .select({
      email: contacts.email,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(contactListMembers)
    .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
    .where(eq(contactListMembers.listId, campaign.listId))
    .all()
    .filter((r) => r.email);

  if (recipients.length === 0) throw new Error("No contacts with email addresses in this list");

  db.update(campaigns)
    .set({ status: "sending" })
    .where(eq(campaigns.id, campaignId))
    .run();

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM ?? "Bizkit <noreply@bizkit.app>";
  const html = renderTemplate(template.content as Block[]);

  let sent = 0;
  let bounced = 0;

  for (const recipient of recipients) {
    try {
      await resend.emails.send({
        from,
        to: recipient.email!,
        subject: template.subject,
        html,
      });
      sent++;
    } catch {
      bounced++;
    }
  }

  db.update(campaigns)
    .set({
      status: "sent",
      sentAt: sql`datetime('now')`,
    })
    .where(eq(campaigns.id, campaignId))
    .run();

  db.update(campaignStats)
    .set({ sent, delivered: sent, bounced })
    .where(eq(campaignStats.campaignId, campaignId))
    .run();

  revalidatePath(`/marketing/campaigns/${campaignId}`);
  revalidatePath("/marketing/campaigns");
}
