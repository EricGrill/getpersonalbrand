import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { prisma } from '../src/lib/prisma'
import { rateLimit } from '../src/lib/rate-limit'

vi.mock('../src/lib/prisma', async () => {
  const { PrismaClient } = await import('@prisma/client')
  return {
    prisma: new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL ?? 'postgresql://unused:unused@localhost:5432/unused' } },
    }),
  }
})

const databaseConfigured = Boolean(process.env.TEST_DATABASE_URL)
const prefix = `foundation-test:${randomUUID()}`

// Use only an isolated test database with the baseline migration already applied.
describe.skipIf(!databaseConfigured)('PostgreSQL foundation integration', () => {
  afterAll(async () => {
    vi.restoreAllMocks()
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: prefix } } })
    await prisma.user.deleteMany({ where: { username: prefix } })
    await prisma.$disconnect()
  })

  it('atomically accepts only the limit during concurrent requests', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 0, 1))
    try {
      const options = { key: `${prefix}:concurrent`, limit: 5, windowSeconds: 60 }
      const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit(options)))
      expect(results.filter((result) => result.ok)).toHaveLength(5)
      expect(results.every((result) => result.remaining >= 0)).toBe(true)
      const row = await prisma.rateLimit.findFirstOrThrow({ where: { key: options.key } })
      expect(row.count).toBe(20)

      now.mockReturnValue(Date.UTC(2026, 0, 1, 0, 1))
      await expect(rateLimit(options)).resolves.toEqual({ ok: true, remaining: 4 })
    } finally {
      now.mockRestore()
    }
  })

  it('creates all new child records and cascades user deletion', async () => {
    const expiresAt = new Date('2027-01-01T00:00:00Z')
    const user = await prisma.user.create({
      data: {
        email: `${prefix}@example.com`,
        username: prefix,
        disabledAt: new Date(),
        passwordResetTokens: { create: { tokenHash: `${prefix}:reset`, expiresAt } },
        emailVerificationTokens: { create: { tokenHash: `${prefix}:verify`, expiresAt } },
        uploads: { create: { url: `https://example.com/${prefix}`, pathname: prefix, size: 123, contentType: 'image/png' } },
        site: {
          create: {
            publishedContent: [],
            publishedTheme: {},
            publishedAt: new Date(),
            suspendedAt: new Date(),
            suspendedReason: 'Integration test',
            domains: { create: { domain: `${prefix}.example.com`, verification: {}, lastCheckedAt: new Date(), lastError: 'test' } },
            analyticsEvents: { create: { eventType: 'page_view', visitorHash: prefix } },
            contactMessages: { create: { name: 'Test', email: 'test@example.com', message: 'Test contact' } },
            abuseReports: { create: { reason: 'Test report', details: 'Integration only' } },
          },
        },
      },
      include: { site: true },
    })
    const siteId = user.site!.id
    await prisma.user.delete({ where: { id: user.id } })
    const counts = await Promise.all([
      prisma.site.count({ where: { id: siteId } }),
      prisma.domain.count({ where: { siteId } }),
      prisma.analyticsEvent.count({ where: { siteId } }),
      prisma.contactMessage.count({ where: { siteId } }),
      prisma.abuseReport.count({ where: { siteId } }),
      prisma.passwordResetToken.count({ where: { userId: user.id } }),
      prisma.emailVerificationToken.count({ where: { userId: user.id } }),
      prisma.upload.count({ where: { userId: user.id } }),
    ])
    expect(counts).toEqual(Array(8).fill(0))
  })
})
