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

## Circles and permissions

- A circle (`CareCircle`) is care for one person. Default permissions per role live in `src/lib/permissions.ts` (the data map decisions); never hard-code them elsewhere.
- The circle form (`parseCircleForm`) is shared by creating a circle and editing the care recipient's data (`updateCircle`, coordinators only, each changed part logged). `deleteCircle` removes the circle with everything in it through database cascades; the settings ask the coordinator to type the circle's name first (`confirmsCircleName`).
- Read circle data through `getCircleForMember` (`src/lib/circles.ts`): it returns null for non-members and hides profile details without the `PROFILE` permission. Server actions must check permissions again (e.g. `MANAGE` before inviting).
- Invitations (`src/lib/invitations.ts`): one-time links valid 7 days; only a SHA-256 hash of the token is stored and the link is shown once.
- Roles and permissions change through `updateMember`; people are removed or leave through `removeMember` (`src/lib/members.ts`). Both lock the circle's coordinators, so a circle always keeps at least one (data map, decision 7). `MANAGE` comes only with the coordinator role; `EDITABLE_PERMISSIONS` (`src/lib/permissions.ts`, safe to import in client components) lists what a coordinator can switch for others.
- Log access with `logAccess` (`src/lib/audit.ts`): views of the care recipient's data and every change. For `Membership` entries `entityId` is the member's user id; device entries carry `deviceName`, so the log stays readable after unpairing. `getAccessLog` (`src/lib/access-log.ts`) turns entries into readable events and deletes entries older than 12 months.
- Business logic stays free of Next.js request APIs so `tests/*.test.ts` (`npm run test:db`, Node test runner via tsx) can run it against the CI database.

## Plan and tasks

- Tasks (`src/lib/tasks.ts`, data map section 5) have an optional day (`@db.Date`) and time (`"HH:MM"`), both Polish time. Use `src/lib/dates.ts` (`todayInPoland`, `addDays`, `dayToDate`, `dayForDisplay`), never the server's own day.
- Anyone with `TASKS` adds tasks, takes them ("Biorę to", `claimTask`) and marks them done; the person who added a task or a coordinator deletes it. Leaving the circle puts the person's open tasks back in the pool.
- Access log entities: `Task` (VIEW, CREATE, UPDATE, DELETE), `TaskAssignee` (taking a task), `TaskDone` (CREATE = done, DELETE = not done again); `entityId` is the task id. Task text may reveal health: it is read from the task when the log is shown, never copied into it.
- The senior screen shows today's tasks marked `showToSenior`.

## Senior screen

- The senior has no account. A coordinator shows a one-time QR code (`DevicePairing`, 30 minutes, only a hash stored) on `/krag/[id]/polacz`. The device opens `/senior/polacz/[token]` and pairs only after a tap on "Połącz": link previews in chat apps open links too, so a GET never uses up a code.
- A paired device (`PairedDevice`) keeps a secret token in the httpOnly cookie `krag_device` (`src/lib/device-cookie.ts`); only its hash is stored. `src/proxy.ts` renews the cookie on every visit. Read the device with `getPairedDevice()` from `src/lib/senior-device.ts`; on the start page a paired device without a session goes straight to `/senior`.
- Logic: `src/lib/devices.ts` (pairing, unpairing, visits) and `src/lib/contacts.ts` (the emergency contacts shown as call buttons). Only coordinators (`MANAGE`) pair devices and change the numbers.
- A visit to the senior screen goes into the access log at most once an hour (`recordDeviceVisit`).
- Keep the senior screen calm: big text, few elements, nothing that signs out or deletes. Time-dependent text (clock, greeting) renders on the device only (`useSyncExternalStore` with a `null` server snapshot).
