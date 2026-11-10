# Krąg: notes for AI assistants

Eldercare coordination app for Polish families: a family panel, a panel for professional caregivers and nurses, and a simplified senior screen. The owner works in VS Code on Windows; explain any steps for her in Polish, explicitly and one at a time.

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, next-intl 4 without i18n routing (locale from the `NEXT_LOCALE` cookie, then `Accept-Language`, default `pl`), ESLint 9 flat config, Prettier.

## Rules

- The app speaks Polish (default), Ukrainian, Russian and English. Every UI text lives in each file in `messages/` (`pl`, `uk`, `ru`, `en`) with identical keys, and the list in `src/i18n/config.ts` must match the files (`npm run check:messages`). Code in English; URLs in Polish; write UI text in Polish first, then translate.
- Health data is a special category under GDPR (art. 9). Use only fake test data until the legal set in `docs/prywatnosc.md` is complete.
- No trackers and no third-party requests from the browser (fonts are self-hosted through `next/font`). No location tracking of caregivers.
- `docs/mapa-danych.md` (data map, in Polish) lists every kind of data we store, why, who sees it and for how long. Update it before adding any table or field to the database.
- AI features only propose; a person confirms, and AI-made content is labelled.
- Secrets only in `.env.local` (ignored by git); document variables in `.env.example`.
- Keep render pure: no `Date.now()` or `Math.random()` while rendering (React hooks lint rules).
- Before pushing run `npm run check` and `npm run build`; CI runs the same checks on every pull request.
- Changes go through pull requests; the owner merges them.

## Database

- Prisma 7 with the `prisma-client` generator: the client is generated into `src/generated/prisma` (ignored by git, created by `npm install` through `postinstall`). Import it as `@/generated/prisma/client`; use `db` from `src/lib/db.ts` in app code.
- PostgreSQL on Neon (project `krag`, Frankfurt). Prisma commands read `DATABASE_URL` from `.env.local` through `prisma.config.ts`.
- Migrations live in `prisma/migrations`. After changing `prisma/schema.prisma`, add a migration. If you cannot run Prisma locally, push the change: the CI step "Baza danych - czy migracje zgadzają się ze schematem" prints the SQL of the missing migration.
- `prisma/seed.ts` holds only made-up test data and must stay idempotent.
- When `package.json` changes on a branch, the `lockfile.yml` workflow updates `package-lock.json` and reruns CI.

## Sign-in

- Better Auth (`src/lib/auth.ts`) with the email OTP plugin: 6-digit codes, valid 10 minutes, 3 attempts, stored hashed. Accounts and sessions live in our database (`User`, `Session`, `Account`, `Verification`).
- Codes are sent by `src/lib/email.ts`. No email provider yet: in development the code is printed in the terminal; in production sending fails until a provider is configured before the beta. `KRAG_TEST_CODE_LOG` (used only by the smoke test) writes codes to a file.
- In server components use `getSession()` and `requireUser(path)` from `src/lib/session.ts`. Redirect targets go through `safeNextPath`.
- Production needs `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.
