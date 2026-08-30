import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
};

// ── Auth ──────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "staff"] })
    .notNull()
    .default("staff"),
  ...timestamps,
});

// ── CRM ───────────────────────────────────────────────
export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sector: text("sector"),
  city: text("city"),
  website: text("website"),
  notes: text("notes"),
  ...timestamps,
});

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  ...timestamps,
});

export const opportunities = sqliteTable("opportunities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id").references(() => contacts.id),
  ownerId: integer("owner_id").references(() => users.id),
  name: text("name").notNull(),
  stage: text("stage", {
    enum: ["identified", "qualified", "proposal", "negotiation", "won", "lost"],
  })
    .notNull()
    .default("identified"),
  value: real("value").default(0),
  ...timestamps,
});

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactId: integer("contact_id").references(() => contacts.id),
  companyId: integer("company_id").references(() => companies.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type", { enum: ["email", "call", "meeting", "note"] }).notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  date: text("date").notNull(),
  ...timestamps,
});

// ── Email Marketing ───────────────────────────────────
export const emailTemplates = sqliteTable("email_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content", { mode: "json" }).notNull(),
  ...timestamps,
});

export const contactLists = sqliteTable("contact_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

export const contactListMembers = sqliteTable("contact_list_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listId: integer("list_id")
    .notNull()
    .references(() => contactLists.id),
  contactId: integer("contact_id")
    .notNull()
    .references(() => contacts.id),
});

export const campaigns = sqliteTable("campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").references(() => emailTemplates.id),
  listId: integer("list_id").references(() => contactLists.id),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["draft", "scheduled", "sending", "sent", "failed"],
  })
    .notNull()
    .default("draft"),
  scheduledAt: text("scheduled_at"),
  sentAt: text("sent_at"),
  ...timestamps,
});

export const campaignStats = sqliteTable("campaign_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  sent: integer("sent").default(0),
  delivered: integer("delivered").default(0),
  opened: integer("opened").default(0),
  clicked: integer("clicked").default(0),
  bounced: integer("bounced").default(0),
});

// ── Invoicing ─────────────────────────────────────────
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reference: text("reference").notNull().unique(),
  companyId: integer("company_id").references(() => companies.id),
  contactId: integer("contact_id").references(() => contacts.id),
  status: text("status", {
    enum: ["draft", "issued", "partially_paid", "paid", "cancelled"],
  })
    .notNull()
    .default("draft"),
  dueDate: text("due_date"),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  ...timestamps,
});

export const invoiceLineItems = sqliteTable("invoice_line_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull(),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id),
  amount: real("amount").notNull(),
  method: text("method"),
  reference: text("reference"),
  paidAt: text("paid_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Support ───────────────────────────────────────────
export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketNumber: text("ticket_number").notNull().unique(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["open", "in_progress", "closed"] })
    .notNull()
    .default("open"),
  contactId: integer("contact_id").references(() => contacts.id),
  companyId: integer("company_id").references(() => companies.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

export const ticketComments = sqliteTable("ticket_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  ...timestamps,
});

export const ticketActivity = sqliteTable("ticket_activity", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id),
  actorId: integer("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  ...timestamps,
});
