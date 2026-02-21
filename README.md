# OJT Daily Logs

OJT Daily Logs is a React + TypeScript application for recording internship/OJT daily activities, tracking rendered hours, and exporting reports.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4 + shadcn UI
- Supabase (Auth + Postgres)
- Vitest + Testing Library

## Features

- Email/password authentication with Supabase
- Create, edit, view, and delete OJT entries
- Automatic total-hours calculation (with noon break exclusion)
- Markdown and PDF export from log details
- Legacy localStorage import into Supabase account
- Mobile-first UI updates and confirmation dialogs

## Prerequisites

- Node.js 18+
- npm
- Supabase project

## Environment Variables

Create a local `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_or_publishable_key
```

## Setup

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

App runs by default at `http://localhost:5173`.

## Supabase Migration

This repository includes a migration for the `ojt_logs` table and RLS policies:

- `supabase/migrations/20260221071005_create_ojt_logs_schema.sql`

To apply via CLI:

```bash
npx supabase login
npx supabase link --project-ref dekygcyziqzanxwbfumj
npx supabase db push
```

If SQL was applied manually, repair migration history:

```bash
npx supabase migration repair --status applied 20260221071005
```

## RLS Verification (Cross-User)

Use this script to verify row-level security setup and perform cross-user checks:

- `supabase/verification/rls_checks.sql`

Recommended process:

1. Create two real test users in Supabase Auth.
2. Replace `<USER_A_UUID>` and `<USER_B_UUID>` in the SQL script.
3. Run the script in Supabase SQL Editor.
4. Sign in from the app as each user and verify each user can only read/write their own rows.

## Scripts

- `npm run dev` - Start local development server
- `npm run build` - Type-check and build production bundle
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest test suite
- `npm run preview` - Preview production build

## Testing

Current test coverage includes:

- `src/lib/time.test.ts` (time calculation logic)
- `src/lib/storage.test.ts` (Supabase-backed storage behavior with mocks)
- `src/App.test.tsx` (auth gate behavior)

Run tests:

```bash
npm test
```

## Notes

- The app is Supabase-first for data operations.
- A one-time local import flow is available if old browser logs are detected.
