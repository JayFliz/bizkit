"use server";

import { db } from "@/db";
import { contacts, companies, opportunities, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createContact(formData: FormData) {
  await requireAuth();
  const data = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    title: (formData.get("title") as string) || undefined,
    companyId: formData.get("companyId")
      ? Number(formData.get("companyId"))
      : undefined,
  };
  db.insert(contacts).values(data).run();
  revalidatePath("/crm/contacts");
}

export async function updateContact(id: number, formData: FormData) {
  await requireAuth();
  db.update(contacts)
    .set({
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      title: (formData.get("title") as string) || null,
      companyId: formData.get("companyId")
        ? Number(formData.get("companyId"))
        : null,
    })
    .where(eq(contacts.id, id))
    .run();
  revalidatePath(`/crm/contacts/${id}`);
  revalidatePath("/crm/contacts");
}

export async function createCompany(formData: FormData) {
  await requireAuth();
  db.insert(companies)
    .values({
      name: formData.get("name") as string,
      sector: (formData.get("sector") as string) || undefined,
      city: (formData.get("city") as string) || undefined,
      website: (formData.get("website") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    })
    .run();
  revalidatePath("/crm/companies");
}

export async function createOpportunity(formData: FormData) {
  const session = await requireAuth();
  db.insert(opportunities)
    .values({
      name: formData.get("name") as string,
      companyId: formData.get("companyId")
        ? Number(formData.get("companyId"))
        : undefined,
      contactId: formData.get("contactId")
        ? Number(formData.get("contactId"))
        : undefined,
      ownerId: session.userId,
      stage: "identified",
      value: formData.get("value") ? Number(formData.get("value")) : 0,
    })
    .run();
  revalidatePath("/crm/pipeline");
}

export async function moveOpportunity(id: number, stage: string) {
  await requireAuth();
  db.update(opportunities)
    .set({ stage: stage as typeof opportunities.$inferSelect.stage })
    .where(eq(opportunities.id, id))
    .run();
  revalidatePath("/crm/pipeline");
}

export async function logActivity(formData: FormData) {
  const session = await requireAuth();
  db.insert(activities)
    .values({
      contactId: formData.get("contactId")
        ? Number(formData.get("contactId"))
        : undefined,
      companyId: formData.get("companyId")
        ? Number(formData.get("companyId"))
        : undefined,
      userId: session.userId,
      type: formData.get("type") as "email" | "call" | "meeting" | "note",
      subject: formData.get("subject") as string,
      body: (formData.get("body") as string) || undefined,
      date: formData.get("date") as string,
    })
    .run();
  const contactId = formData.get("contactId");
  if (contactId) revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath("/");
}
