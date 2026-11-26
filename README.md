# GetPersonalBrand

A web app that lets professionals create a branded personal website combining link-in-bio, about page, and portfolio into one tool.

## Features

- **3-in-1 Website**: Combine your links hub, bio page, and portfolio in one site
- **Drag-and-Drop Editor**: Build your page with blocks (Hero, About, Links, Portfolio, Contact, Divider)
- **Custom Domains**: Use your own domain or a free subdomain (username.getpersonalbrand.com)
- **Analytics Dashboard**: Track page views, link clicks, referrers, and devices
- **Templates**: Choose from Modern, Bold, or Classic templates
- **Theme Customization**: Custom colors, fonts, and styling

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (email/password + Google OAuth)
- **Drag-and-Drop**: dnd-kit
- **Charts**: Recharts
- **Styling**: Tailwind CSS

## Getting Started

Use Node.js 22.12 or newer (Node 22 LTS is used in CI) and PostgreSQL 16.

1. Install the locked dependencies and generate the Prisma 5 client:
   ```bash
   npm ci
   npx --no-install prisma generate
   ```
2. Copy the example configuration and set the two required server variables:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL` to your local PostgreSQL database and `NEXTAUTH_SECRET` to a random secret. For local links, keep `NEXTAUTH_URL=http://localhost:3000` and `NEXT_PUBLIC_APP_DOMAIN=localhost:3000`.
3. Apply the committed migrations to an empty local database:
   ```bash
   npm run db:migrate
   ```
4. Verify the app:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   Open [localhost:3000](http://localhost:3000).

### Migrations and tests

Use `npm run db:migrate:dev -- --name <change>` to create future migrations against a development database. Commit both the schema and generated migration. Use `npm run db:migrate` (`prisma migrate deploy`) to apply committed migrations; do not use `db push`. Prisma CLI and client remain on 5.x. Use the installed CLI through npm scripts or `npx --no-install prisma`.

The baseline creates the complete schema on an empty database. It must not be blindly applied to an existing database previously managed by `db push`: that database needs a separately reviewed baseline reconciliation before migration deployment.

`npm test` runs unit and component tests without a database. To include integration tests, set `TEST_DATABASE_URL` to a dedicated disposable PostgreSQL database and first apply migrations with `DATABASE_URL` pointing to that same test database. Tests create and delete their own fixtures. Never point this variable at a production database. CI supplies PostgreSQL 16, applies the migration, then runs lint, typecheck, all tests and the production build. No optional service credentials are provided to CI.

### Environment variables

Only `DATABASE_URL` and `NEXTAUTH_SECRET` are required by the server env parser. Call `getEnv()` from `src/lib/env.ts` at runtime to validate them; merely importing the module does not validate env or block builds. Empty optional values are treated as unset.

| Optional variables | Purpose and fallback |
| --- | --- |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_DOMAIN`, `NEXT_PUBLIC_SITE_URL_MODE` | Auth callback origin; link host (default `getpersonalbrand.com`); public link mode (`path` by default, or `subdomain`). Set the public host for local and preview links. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Enable Google OAuth when both are configured. |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `BLOB_READ_WRITE_TOKEN` | Future custom-domain and image-upload integrations. No provisioning is performed by setup. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email delivery via Resend when configured. Without a key the helper logs a disabled-delivery notice and returns `{ sent: false }`. A key requires a sender address. |
| `ADMIN_EMAILS`, `CRON_SECRET`, `ANALYTICS_SALT`, `TEST_DATABASE_URL` | Comma-separated admin emails; future cron protection and analytics hashing; optional isolated integration test database. |

See [architecture decisions and cross-ticket contracts](docs/ARCHITECTURE.md).

### Shared helper behavior

`appUrl`, `siteUrl` and `siteHost` use only public configuration and can be imported by client components. `siteHost` returns the app host in path mode and the username subdomain host in subdomain mode. Normalize usernames before storing them and validate with `validateUsername`; reject unsafe link input with `safeHref`.

`rateLimit` uses fixed UTC windows and an atomic PostgreSQL upsert shared by all app instances. Database errors propagate to callers. `clientIp` trusts forwarded IP headers only when the deployment proxy overwrites client-supplied values; configure that trust boundary before using it outside Vercel. Expired `RateLimit` rows are retained; periodic cleanup is an operational follow-up, not part of request handling.

## Project Structure

```
src/
├── app/
│   ├── (app)/           # Dashboard routes (dashboard, editor, analytics, settings)
│   ├── (auth)/          # Auth routes (login, register)
│   ├── api/             # API routes
│   ├── onboarding/      # Onboarding wizard
│   └── s/               # Published site routes
├── components/
│   ├── blocks/          # Block components (Hero, About, Links, etc.)
│   ├── dashboard/       # Dashboard UI components
│   ├── editor/          # Page editor components
│   └── site/            # Published site renderer
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client
│   └── templates.ts     # Site templates
└── types/
    └── blocks.ts        # Block type definitions
```

## Deployment

Deploy to Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Configure custom domains in Vercel project settings

For custom domain support, configure:
- Wildcard domain: `*.getpersonalbrand.com`
- App subdomain: `app.getpersonalbrand.com`

## License

MIT
