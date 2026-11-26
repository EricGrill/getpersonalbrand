import { isIP } from 'node:net'
import { prisma } from './prisma'

interface RateLimitOptions {
  key: string
  limit: number
  windowSeconds: number
}

/** Fixed UTC windows shared by every app instance. Database failures propagate. */
export async function rateLimit({ key, limit, windowSeconds }: RateLimitOptions) {
  if (!key || !Number.isSafeInteger(limit) || limit < 1 || limit > 2147483647) {
    throw new Error('Rate limit requires a key and a positive integer limit')
  }
  if (!Number.isSafeInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 2147483647) {
    throw new Error('Rate limit requires a positive integer windowSeconds')
  }

  const windowMs = windowSeconds * 1000
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs)
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"
  `

  return { ok: row.count <= limit, remaining: Math.max(0, limit - row.count) }
}

/** Only trust these headers behind a proxy that overwrites inbound client IP headers. */
export function clientIp(headers: Pick<Headers, 'get'>): string {
  const forwarded = headers.get('x-vercel-forwarded-for') ?? headers.get('x-forwarded-for')
  const candidate = (forwarded?.split(',')[0] ?? headers.get('x-real-ip'))?.trim()
  return candidate && isIP(candidate) ? candidate : 'unknown'
}
