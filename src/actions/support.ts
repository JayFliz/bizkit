"use server";

import { db } from "@/db";
import { tickets, ticketComments, ticketActivity } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function nextTicketNumber(): string {
  const last = db
    .select({ num: sql<string>`ticket_number` })
    .from(tickets)
    .orderBy(sql`id DESC`)
    .limit(1)
    .get();

  if (!last) return "TK-001";
  const num = parseInt(last.num.replace("TK-", ""), 10);
  return `TK-${String(num + 1).padStart(3, "0")}`;
}

export async function createTicket(formData: FormData) {
  const session = await requireAuth();

  const result = db
    .insert(tickets)
    .values({
      ticketNumber: nextTicketNumber(),
      subject: formData.get("subject") as string,
      body: formData.get("body") as string,
      contactId: formData.get("contactId")
        ? Number(formData.get("contactId"))
        : undefined,
      companyId: formData.get("companyId")
        ? Number(formData.get("companyId"))
        : undefined,
      createdBy: session.userId,
    })
    .run();

  const ticketId = Number(result.lastInsertRowid);

  db.insert(ticketActivity)
    .values({
      ticketId,
      actorId: session.userId,
      action: "created",
    })
    .run();

  revalidatePath("/support/tickets");
  redirect(`/support/tickets/${ticketId}`);
}

export async function updateTicketStatus(ticketId: number, status: string) {
  const session = await requireAuth();

  const ticket = db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
  }).sync();
  if (!ticket) throw new Error("Ticket not found");

  db.update(tickets)
    .set({ status: status as typeof tickets.$inferSelect.status })
    .where(eq(tickets.id, ticketId))
    .run();

  db.insert(ticketActivity)
    .values({
      ticketId,
      actorId: session.userId,
      action: "status_change",
      oldValue: ticket.status,
      newValue: status,
    })
    .run();

  revalidatePath(`/support/tickets/${ticketId}`);
  revalidatePath("/support/tickets");
}

export async function assignTicket(ticketId: number, assigneeId: number) {
  const session = await requireAuth();

  const user = db.query.users.findFirst({
    where: eq(
      (await import("@/db/schema")).users.id,
      assigneeId
    ),
  }).sync();

  db.update(tickets)
    .set({ assignedTo: assigneeId })
    .where(eq(tickets.id, ticketId))
    .run();

  db.insert(ticketActivity)
    .values({
      ticketId,
      actorId: session.userId,
      action: "assigned",
      newValue: user?.name ?? String(assigneeId),
    })
    .run();

  revalidatePath(`/support/tickets/${ticketId}`);
}

export async function addComment(ticketId: number, formData: FormData) {
  const session = await requireAuth();

  db.insert(ticketComments)
    .values({
      ticketId,
      authorId: session.userId,
      body: formData.get("body") as string,
    })
    .run();

  db.insert(ticketActivity)
    .values({
      ticketId,
      actorId: session.userId,
      action: "comment_added",
    })
    .run();

  revalidatePath(`/support/tickets/${ticketId}`);
}
