This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Set these in `.env.local`:

```bash
# Postgres connection string of the Quicktalog database (Supabase → Connect).
# The pooler URL (port 6543) is recommended on serverless hosts.
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<host>:6543/postgres
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
# Signs the admin session cookie. At least 32 random characters, e.g.
# `openssl rand -base64 48`. Sign-in is refused until it is set.
SESSION_SECRET=...

# Optional. Internal and test accounts, left out of every figure by default
# and out of every outreach list: addresses and whole domains.
INTERNAL_EMAILS=me@example.com,@quicktalog.app

# Optional. A read-only Paddle Billing API key with metrics.read,
# subscription.read and transaction.read. Without it, Revenue shows an MRR
# estimate from list prices and Customers reads the database mirror.
PADDLE_API_KEY=...
# PADDLE_ENV=sandbox   # to read the sandbox instead of live
```

The page and every API route check the session cookie on the server before
reading any data. Outreach lists are exported from `/api/outreach/<list>` as
CSV (or `?format=emails` for a comma-separated list) by a signed-in admin.

Then run the development server:

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
