"use server";

import { db } from "@/db";
import { invoices, invoiceLineItems, payments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateRef } from "@/lib/utils";
import { redirect } from "next/navigation";

export async function createInvoice(formData: FormData) {
  await requireAuth();

  const reference = generateRef("INV");
  const result = db
    .insert(invoices)
    .values({
      reference,
      companyId: formData.get("companyId")
        ? Number(formData.get("companyId"))
        : undefined,
      contactId: formData.get("contactId")
        ? Number(formData.get("contactId"))
        : undefined,
      dueDate: (formData.get("dueDate") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      status: "draft",
    })
    .run();

  const invoiceId = Number(result.lastInsertRowid);

  const descriptions = formData.getAll("lineDescription") as string[];
  const quantities = formData.getAll("lineQuantity") as string[];
  const prices = formData.getAll("linePrice") as string[];

  for (let i = 0; i < descriptions.length; i++) {
    if (descriptions[i]) {
      db.insert(invoiceLineItems)
        .values({
          invoiceId,
          description: descriptions[i],
          quantity: Number(quantities[i]) || 1,
          unitPrice: Number(prices[i]) || 0,
        })
        .run();
    }
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

const validTransitions: Record<string, string[]> = {
  draft: ["issued", "cancelled"],
  issued: ["partially_paid", "paid", "cancelled"],
  partially_paid: ["paid", "cancelled"],
};

export async function transitionInvoice(id: number, newStatus: string) {
  await requireAuth();

  const invoice = db.query.invoices.findFirst({
    where: eq(invoices.id, id),
  }).sync();
  if (!invoice) throw new Error("Invoice not found");

  const allowed = validTransitions[invoice.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from ${invoice.status} to ${newStatus}`
    );
  }

  db.update(invoices)
    .set({ status: newStatus as typeof invoices.$inferSelect.status })
    .where(eq(invoices.id, id))
    .run();

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

export async function recordPayment(id: number, formData: FormData) {
  await requireAuth();

  const amount = Number(formData.get("amount"));
  const method = (formData.get("method") as string) || undefined;
  const reference = (formData.get("reference") as string) || undefined;

  db.insert(payments)
    .values({ invoiceId: id, amount, method, reference })
    .run();

  const totalPaid = db
    .select({ total: sql<number>`coalesce(sum(amount), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, id))
    .get()!.total;

  const invoiceTotal = db
    .select({
      total: sql<number>`coalesce(sum(quantity * unit_price), 0)`,
    })
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id))
    .get()!.total;

  const newStatus = totalPaid >= invoiceTotal ? "paid" : "partially_paid";

  db.update(invoices)
    .set({ status: newStatus })
    .where(eq(invoices.id, id))
    .run();

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}
