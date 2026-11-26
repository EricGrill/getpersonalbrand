# Architecture

Source: [getpersonalbrand.com Linear project](https://linear.app/chainbytes/project/getpersonalbrandcom-c009398932dc). Copied on 2026-11-26; punctuation normalised.

## Decisions made in the plan

1. **One app host.** `getpersonalbrand.com` serves marketing, login, dashboard and editor. `app.getpersonalbrand.com` redirects to it.
2. **Public sites have three addresses.** `<username>.getpersonalbrand.com`, a verified custom domain, and `getpersonalbrand.com/site/<username>`, which works everywhere (local, previews, and before the wildcard DNS exists). `NEXT_PUBLIC_SITE_URL_MODE` (`path` or `subdomain`) picks which one the app shows and links to. Default is `path`, so launch does not wait for DNS.
3. **Draft and published copies.** The editor saves a draft. Publish copies it to a snapshot, and public pages only read the snapshot.
4. **No new vendors beyond Vercel.** Postgres through the Vercel Marketplace (Neon), Vercel Blob for images, rate limits in Postgres, Resend for email only if Eric adds a key. Every outside service is optional in code: without its env vars the feature says it is not configured and the build still passes.
5. **Free only.** No billing code.

## Contracts every ticket follows

* **Routes:** `/s/[username]` renders a site by username; `/d/[domain]` renders by custom domain. Only the proxy rewrites to them.
* **Tracking:** `POST /api/analytics/track` with `{ siteId, eventType: "page_view" | "link_click", linkId?, referrer? }`.
* **Contact:** `POST /api/contact` with `{ siteId, name, email, message, website }` (`website` is a honeypot and must be empty).
* **Reports:** public pages link to `/report?site=<username>`.
* **Block data shapes** in `src/types/blocks.ts` do not change. `theme.template` is `modern`, `bold` or `classic`.
* **Shared code from Foundation:** `src/lib/env.ts`, `site-url.ts`, `usernames.ts`, `safe-url.ts`, `rate-limit.ts`, `email.ts`, `src/components/ui/ImageField.tsx`, and the full Prisma schema. Other tickets do not edit `prisma/schema.prisma`, `package.json` scripts, `next.config.ts` or the CI workflow; if one needs a change there, it says so in its PR.
* Each ticket owns the files it lists. If two tickets touch the same file, the ticket says which lines.
