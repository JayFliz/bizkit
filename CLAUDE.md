@AGENTS.md

# Bizkit - Small Business Toolkit

## Stack
- Next.js 15 (App Router, server components, server actions)
- Drizzle ORM + better-sqlite3 (data/bizkit.db)
- Tailwind CSS 4
- iron-session for auth
- TypeScript

## Dev Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run db:seed` — reset and seed database

## Auth
- Login: admin@bizkit.app / password (also sarah@bizkit.app, mike@bizkit.app)
- iron-session cookie: "bizkit-session"

## Architecture
- `src/app/` — Next.js App Router pages
- `src/actions/` — server actions (auth, crm, invoices, support, marketing)
- `src/db/schema.ts` — Drizzle schema (all tables)
- `src/db/seed.ts` — database seeder
- `src/components/` — UI components organized by module
- `src/lib/auth.ts` — session config
- `infra/` — OpenTofu EC2 deployment (adapted from helpdesk project)

## Modules
- **CRM** (/crm) — contacts, companies, pipeline kanban, activities
- **Marketing** (/marketing) — email templates, campaigns, contact lists
- **Invoicing** (/invoices) — invoice CRUD with state machine, payments
- **Support** (/support) — tickets, comments, activity log

## Drizzle Sync Queries
This version of drizzle-orm wraps relational queries in `SQLiteSyncRelationalQuery`.
Always call `.sync()` on `db.query.*.findFirst()` and `db.query.*.findMany()` results.
