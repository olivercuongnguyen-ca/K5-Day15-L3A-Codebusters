# Unify (frontend) — Lịch AI20K

Unify's screens run on the real backend (FastAPI, `codebase/web/server.py`) — no mock data:
today / week / month schedule, room map, AI leave-request draft, team meetings, settings (Phoenix link, team,
calendar sync), student ID entry and admin / mentor sign-in.

```bash
# 1. backend (repo root), port 8000
python3 run.py
# 2. this app, port 3000 — /api/* is proxied to the backend (next.config.ts), so cookies just work
cd frontend && npm install && npm run dev
```

Another backend address: `BACKEND_URL=http://host:port npm run dev`. Data access lives in `src/lib/backend.ts`
(API client + backend item → `ScheduleEvent`) and `src/components/app/app-provider.tsx` (identity, schedule).
The `src/data/mock-*.ts` files only keep the shared types and the design-system showcase data.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
