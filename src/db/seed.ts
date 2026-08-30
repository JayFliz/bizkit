import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "bizkit.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

async function seed() {
  console.log("Seeding database...");

  // Drop all tables and recreate
  sqlite.exec(`
    DROP TABLE IF EXISTS ticket_activity;
    DROP TABLE IF EXISTS ticket_comments;
    DROP TABLE IF EXISTS tickets;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS invoice_line_items;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS campaign_stats;
    DROP TABLE IF EXISTS campaigns;
    DROP TABLE IF EXISTS contact_list_members;
    DROP TABLE IF EXISTS contact_lists;
    DROP TABLE IF EXISTS email_templates;
    DROP TABLE IF EXISTS activities;
    DROP TABLE IF EXISTS opportunities;
    DROP TABLE IF EXISTS contacts;
    DROP TABLE IF EXISTS companies;
    DROP TABLE IF EXISTS users;
  `);

  // Create tables
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sector TEXT,
      city TEXT,
      website TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER REFERENCES companies(id),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      title TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id),
      company_id INTEGER REFERENCES companies(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER REFERENCES companies(id),
      contact_id INTEGER REFERENCES contacts(id),
      owner_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'identified',
      value REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE contact_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE contact_list_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL REFERENCES contact_lists(id),
      contact_id INTEGER NOT NULL REFERENCES contacts(id)
    );

    CREATE TABLE campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES email_templates(id),
      list_id INTEGER REFERENCES contact_lists(id),
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE campaign_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
      sent INTEGER DEFAULT 0,
      delivered INTEGER DEFAULT 0,
      opened INTEGER DEFAULT 0,
      clicked INTEGER DEFAULT 0,
      bounced INTEGER DEFAULT 0
    );

    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      company_id INTEGER REFERENCES companies(id),
      contact_id INTEGER REFERENCES contacts(id),
      status TEXT NOT NULL DEFAULT 'draft',
      due_date TEXT,
      notes TEXT,
      cancel_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE invoice_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL
    );

    CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      amount REAL NOT NULL,
      method TEXT,
      reference TEXT,
      paid_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      contact_id INTEGER REFERENCES contacts(id),
      company_id INTEGER REFERENCES companies(id),
      assigned_to INTEGER REFERENCES users(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE ticket_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id),
      author_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE ticket_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id),
      actor_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Users ──
  const hash = await bcrypt.hash("password", 10);
  db.insert(schema.users)
    .values([
      { email: "admin@bizkit.app", name: "Admin User", passwordHash: hash, role: "admin" },
      { email: "sarah@bizkit.app", name: "Sarah Chen", passwordHash: hash, role: "staff" },
      { email: "mike@bizkit.app", name: "Mike Johnson", passwordHash: hash, role: "staff" },
    ])
    .run();

  // ── Companies ──
  db.insert(schema.companies)
    .values([
      { name: "Acme Corp", sector: "Technology", city: "London", website: "https://acme.co" },
      { name: "Bright Ideas Ltd", sector: "Marketing", city: "Manchester", website: "https://brightideas.co.uk" },
      { name: "CloudNine Solutions", sector: "SaaS", city: "Bristol", website: "https://cloudnine.io" },
      { name: "DataForge Analytics", sector: "Data", city: "Edinburgh", website: "https://dataforge.co.uk" },
      { name: "Evergreen Consulting", sector: "Consulting", city: "Birmingham" },
    ])
    .run();

  // ── Contacts ──
  db.insert(schema.contacts)
    .values([
      { companyId: 1, firstName: "James", lastName: "Wilson", email: "james@acme.co", phone: "07700 900001", title: "CTO" },
      { companyId: 1, firstName: "Emma", lastName: "Taylor", email: "emma@acme.co", phone: "07700 900002", title: "Head of Ops" },
      { companyId: 2, firstName: "Oliver", lastName: "Brown", email: "oliver@brightideas.co.uk", phone: "07700 900003", title: "MD" },
      { companyId: 3, firstName: "Sophie", lastName: "Davis", email: "sophie@cloudnine.io", phone: "07700 900004", title: "CEO" },
      { companyId: 3, firstName: "Liam", lastName: "Martinez", email: "liam@cloudnine.io", title: "VP Engineering" },
      { companyId: 4, firstName: "Charlotte", lastName: "White", email: "charlotte@dataforge.co.uk", phone: "07700 900006", title: "Head of Sales" },
      { companyId: 5, firstName: "Harry", lastName: "Anderson", email: "harry@evergreen.co", title: "Partner" },
      { firstName: "Amelia", lastName: "Thomas", email: "amelia.thomas@gmail.com", phone: "07700 900008", title: "Freelance Designer" },
    ])
    .run();

  // ── Opportunities ──
  db.insert(schema.opportunities)
    .values([
      { companyId: 1, contactId: 1, ownerId: 1, name: "Acme Platform Rebuild", stage: "proposal", value: 45000 },
      { companyId: 2, contactId: 3, ownerId: 2, name: "Bright Ideas Website Redesign", stage: "qualified", value: 12000 },
      { companyId: 3, contactId: 4, ownerId: 1, name: "CloudNine Integration Project", stage: "negotiation", value: 28000 },
      { companyId: 4, contactId: 6, ownerId: 3, name: "DataForge Dashboard Build", stage: "identified", value: 8000 },
      { companyId: 5, contactId: 7, ownerId: 2, name: "Evergreen CRM Setup", stage: "won", value: 15000 },
    ])
    .run();

  // ── Activities ──
  db.insert(schema.activities)
    .values([
      { contactId: 1, companyId: 1, userId: 1, type: "meeting", subject: "Initial scoping call", body: "Discussed platform requirements and timeline", date: "2026-08-25" },
      { contactId: 3, companyId: 2, userId: 2, type: "email", subject: "Follow up on proposal", body: "Sent revised quote with updated timeline", date: "2026-08-27" },
      { contactId: 4, companyId: 3, userId: 1, type: "call", subject: "Contract negotiation", body: "Agreed on payment terms, final review pending", date: "2026-08-28" },
      { contactId: 6, companyId: 4, userId: 3, type: "note", subject: "Research notes", body: "Charlotte mentioned they need real-time dashboards", date: "2026-08-29" },
      { contactId: 1, companyId: 1, userId: 1, type: "email", subject: "Sent technical spec", date: "2026-08-29" },
    ])
    .run();

  // ── Contact Lists ──
  db.insert(schema.contactLists)
    .values([
      { name: "Newsletter Subscribers", description: "Monthly product newsletter" },
      { name: "Product Launch", description: "Contacts for upcoming product launch" },
    ])
    .run();

  db.insert(schema.contactListMembers)
    .values([
      { listId: 1, contactId: 1 },
      { listId: 1, contactId: 3 },
      { listId: 1, contactId: 4 },
      { listId: 1, contactId: 6 },
      { listId: 1, contactId: 8 },
      { listId: 2, contactId: 1 },
      { listId: 2, contactId: 4 },
      { listId: 2, contactId: 5 },
    ])
    .run();

  // ── Email Templates ──
  db.insert(schema.emailTemplates)
    .values([
      {
        name: "Monthly Newsletter",
        subject: "What's new at Bizkit",
        content: JSON.stringify([
          { type: "heading", content: "Monthly Update" },
          { type: "text", content: "Here's what we've been working on this month..." },
          { type: "button", content: "Read More", url: "https://bizkit.app/blog" },
        ]),
      },
      {
        name: "Product Launch",
        subject: "Introducing our new feature",
        content: JSON.stringify([
          { type: "heading", content: "Something big is coming" },
          { type: "image", url: "https://placehold.co/600x200", alt: "Product banner" },
          { type: "text", content: "We're excited to announce our latest feature..." },
          { type: "button", content: "Learn More", url: "https://bizkit.app/launch" },
        ]),
      },
    ])
    .run();

  // ── Campaigns ──
  db.insert(schema.campaigns)
    .values([
      { templateId: 1, listId: 1, name: "August Newsletter", status: "sent", sentAt: "2026-08-15" },
      { templateId: 2, listId: 2, name: "Feature Launch Announcement", status: "draft" },
    ])
    .run();

  db.insert(schema.campaignStats)
    .values([
      { campaignId: 1, sent: 5, delivered: 5, opened: 3, clicked: 2, bounced: 0 },
    ])
    .run();

  // ── Invoices ──
  db.insert(schema.invoices)
    .values([
      { reference: "INV-2608-A1B2", companyId: 1, contactId: 1, status: "issued", dueDate: "2026-09-25" },
      { reference: "INV-2608-C3D4", companyId: 3, contactId: 4, status: "paid", dueDate: "2026-08-15" },
      { reference: "INV-2608-E5F6", companyId: 2, contactId: 3, status: "draft", dueDate: "2026-10-01" },
      { reference: "INV-2608-G7H8", companyId: 5, contactId: 7, status: "issued", dueDate: "2026-09-15" },
    ])
    .run();

  db.insert(schema.invoiceLineItems)
    .values([
      { invoiceId: 1, description: "Platform development - Phase 1", quantity: 1, unitPrice: 22500 },
      { invoiceId: 1, description: "Project management", quantity: 40, unitPrice: 95 },
      { invoiceId: 2, description: "Integration setup", quantity: 1, unitPrice: 14000 },
      { invoiceId: 2, description: "Training sessions", quantity: 3, unitPrice: 500 },
      { invoiceId: 3, description: "Website redesign", quantity: 1, unitPrice: 6000 },
      { invoiceId: 4, description: "CRM setup & configuration", quantity: 1, unitPrice: 7500 },
      { invoiceId: 4, description: "Data migration", quantity: 1, unitPrice: 3000 },
    ])
    .run();

  db.insert(schema.payments)
    .values([
      { invoiceId: 2, amount: 14000, method: "bank_transfer", reference: "PAY-001" },
      { invoiceId: 2, amount: 1500, method: "bank_transfer", reference: "PAY-002" },
    ])
    .run();

  // ── Tickets ──
  db.insert(schema.tickets)
    .values([
      { ticketNumber: "TK-001", subject: "Cannot access dashboard", body: "Getting a 403 error when trying to view the main dashboard after logging in.", status: "open", contactId: 1, companyId: 1, createdBy: 1 },
      { ticketNumber: "TK-002", subject: "Invoice PDF not generating", body: "When I click download PDF on invoice INV-2608-A1B2, nothing happens.", status: "in_progress", contactId: 3, companyId: 2, assignedTo: 2, createdBy: 1 },
      { ticketNumber: "TK-003", subject: "Feature request: bulk email import", body: "We need to import 500+ contacts from a CSV. Is this possible?", status: "open", contactId: 4, companyId: 3, createdBy: 1 },
      { ticketNumber: "TK-004", subject: "Payment confirmation email not sent", body: "Recorded a payment but the customer didn't receive a confirmation.", status: "closed", contactId: 6, companyId: 4, assignedTo: 3, createdBy: 2 },
    ])
    .run();

  db.insert(schema.ticketComments)
    .values([
      { ticketId: 2, authorId: 2, body: "Looking into this — seems to be a rendering issue with the PDF library." },
      { ticketId: 2, authorId: 1, body: "Any update on this? Client is asking." },
      { ticketId: 4, authorId: 3, body: "Fixed — the Resend API key had expired. Renewed and resent the confirmation." },
    ])
    .run();

  db.insert(schema.ticketActivity)
    .values([
      { ticketId: 2, actorId: 1, action: "assigned", newValue: "Sarah Chen" },
      { ticketId: 2, actorId: 2, action: "status_change", oldValue: "open", newValue: "in_progress" },
      { ticketId: 4, actorId: 3, action: "status_change", oldValue: "in_progress", newValue: "closed" },
    ])
    .run();

  console.log("Seed complete!");
  sqlite.close();
}

seed();
