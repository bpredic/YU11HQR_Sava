# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YU1HQR_Sava is a web portal for the **Sava River Days 2026** amateur radio (HAM) WWA-style contest. Activators are pre-registered stations that hunters contact on air. Activators upload log files; hunters look up their callsign to see confirmed QSOs and download a diploma.

The web app lives in the `sava-portal/` subdirectory.

## Build and Development Commands

Run from `sava-portal/`:

```bash
npm run dev          # dev server
npm run build        # production build
npm run type-check   # TypeScript check
npm run lint         # ESLint
npm run seed         # seed admin user (admin / admin123)
npx prisma migrate dev --name <name>   # create new migration
npx prisma generate                    # regenerate Prisma client
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui (based on `@base-ui/react`, **not** Radix UI)
- **Database**: SQLite via Prisma 7 + `@prisma/adapter-better-sqlite3`
- **Auth**: Custom JWT sessions using `jose` (cookies, no NextAuth)
- **Email**: nodemailer (SMTP config in `.env`)
- **PDF**: pdf-lib (diploma generation)

## Architecture

### Key File Locations

- `src/app/` – Next.js App Router pages and API routes
- `src/components/` – React components (mix of server and `'use client'`)
- `src/lib/` – Core utilities:
  - `db.ts` – Prisma client singleton (uses `PrismaBetterSqlite3` adapter, DB at `dev.db` in project root)
  - `auth.ts` – JWT session helpers (`createSession`, `getSession`, `deleteSession`)
  - `scoring.ts` – Contest scoring logic, point values, diploma qualification check
  - `email.ts` – Nodemailer welcome email
  - `parsers/cabrillo.ts` – Cabrillo 3.0 parser
  - `parsers/adif.ts` – ADIF parser
- `prisma/schema.prisma` – Data models: `User`, `Activator`, `LogFile`, `Qso`
- `prisma/seed.ts` – Seeds the admin user

### Database (SQLite)

DB file is at `sava-portal/dev.db` (project root, not `prisma/` folder). The `prisma.config.ts` sets `DATABASE_URL=file:./dev.db` relative to the project root.

### Auth Flow

Two roles: `admin` (one user in `User` table) and `activator` (callsign-based login from `Activator` table). Sessions are 8h JWT stored in an `httpOnly` cookie named `session`. All API routes call `getSession()` to verify.

### Next.js 16 API Notes (breaking changes from v13/14)

- `params` in pages and route handlers are **Promises**: `const { id } = await params`
- `cookies()` and `headers()` from `next/headers` are **async**
- Route handler context uses `RouteContext<'/path/[param]'>` helper (auto-generated, globally available)
- GET handlers are **dynamic by default** (no static caching)
- `@base-ui/react` Dialog does **not** support `asChild` – use `render={<Button />}` prop instead

### shadcn/ui components

Based on `@base-ui/react`. The `DialogTrigger` component uses `render` prop, not `asChild`:
```tsx
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

### Scoring Rules

- Contest period: June 1–7, 2026 (UTC)
- YT1SAVA = 6 pts, YU1HQR = 2 pts, all others = 1 pt
- Max 1 QSO per activator + band + mode combination per hunter
- Mandatory: at least one QSO with YT1SAVA
- Minimum 10 points for diploma
- Allowed modes: CW, SSB, FT8, FT4, FT2, FM (digital modes count separately)

### Duplicate Detection

When uploading a log file, a QSO is considered a duplicate if another QSO with the same `activatorCall + hunterCall + band + mode` exists within a ±5-minute window in the database. Duplicates are stored with `isDuplicate=true`.

## Current Status

The repository contains example Cabrillo and ADIF data files in `LogFiles/`. The web app in `sava-portal/` is fully built and passing `npm run build`.

Default admin credentials (from seed): `admin` / `admin123` — change in `.env` before production use.
Created activator YU1BPC bpredic@gmail.com password gqkzbUujGE

