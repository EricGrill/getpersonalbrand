import { randomUUID } from "node:crypto"
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { prisma } from "./prisma"
import { addDomain } from "./domains"
import { addProjectDomain, domainsConfigured, getDomainConfig } from "./vercel-domains"

vi.mock("./prisma", async () => {
  const { PrismaClient } = await import("@prisma/client")
  return {
    prisma: new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL ?? "postgresql://unused:unused@localhost:5432/unused" } },
    }),
  }
})

vi.mock("./vercel-domains", async (importOriginal) => ({
  ...await importOriginal<typeof import("./vercel-domains")>(),
  domainsConfigured: vi.fn(),
  addProjectDomain: vi.fn(),
  getProjectDomain: vi.fn(),
  getDomainConfig: vi.fn(),
  verifyProjectDomain: vi.fn(),
  removeProjectDomain: vi.fn(),
}))

const databaseConfigured = Boolean(process.env.CI && process.env.TEST_DATABASE_URL)
const runId = randomUUID()
const userIds: string[] = []

async function createSite(label: string) {
  const user = await prisma.user.create({
    data: {
      email: `domains-${runId}-${label}@example.com`,
      username: `domains-${runId}-${label}`,
      site: { create: {} },
    },
    include: { site: true },
  })
  userIds.push(user.id)
  return { userId: user.id, siteId: user.site!.id }
}

// Run only against CI's disposable PostgreSQL database with migrations already applied.
// The provider boundary is fully mocked; these tests never contact Vercel.
describe.skipIf(!databaseConfigured)("PostgreSQL domain reservation concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("VERCEL_PROJECT_ID", "integration-project")
    vi.stubEnv("VERCEL_TEAM_ID", "integration-team")
    vi.stubEnv("NEXT_PUBLIC_APP_DOMAIN", "getpersonalbrand.com")
    vi.mocked(domainsConfigured).mockReturnValue(true)
    vi.mocked(addProjectDomain).mockImplementation(async (name) => ({
      name, apexName: name, projectId: "integration-project", verified: true,
    }))
    vi.mocked(getDomainConfig).mockResolvedValue({
      misconfigured: false,
      recommendedIPv4: [{ rank: 1, value: ["192.0.2.1"] }],
      recommendedCNAME: [],
    })
  })

  afterEach(() => vi.unstubAllEnvs())

  afterAll(async () => {
    try {
      // Cascades remove only rows belonging to this run's explicitly tracked users.
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    } finally {
      await prisma.$disconnect()
    }
  })

  it("allows exactly two of three simultaneous domain additions to one site", async () => {
    const { siteId, userId } = await createSite("quota")
    const domains = [1, 2, 3].map((number) => `quota-${number}-${runId}.example.com`)
    const results = await Promise.allSettled(domains.map((domain) => addDomain(siteId, userId, domain)))

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2)
    const rejected = results.filter((result) => result.status === "rejected")
    expect(rejected).toHaveLength(1)
    expect(rejected[0].reason).toMatchObject({ status: 409, message: "You can connect at most 2 domains per site" })

    const reservations = await prisma.domain.findMany({ where: { siteId } })
    expect(reservations).toHaveLength(2)
    expect(reservations.every((row) => row.status === "verified")).toBe(true)
    expect(addProjectDomain).toHaveBeenCalledTimes(2)
    expect(vi.mocked(addProjectDomain).mock.calls.map(([domain]) => domain).sort())
      .toEqual(reservations.map((row) => row.domain).sort())
  }, 15000)

  it("reserves a hostname for only one site when two sites add it simultaneously", async () => {
    const sites = await Promise.all([createSite("first-owner"), createSite("second-owner")])
    const domain = `shared-${runId}.example.com`
    const results = await Promise.allSettled(sites.map(({ siteId, userId }) => addDomain(siteId, userId, domain)))

    const fulfilled = results.filter((result) => result.status === "fulfilled")
    const rejected = results.filter((result) => result.status === "rejected")
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(rejected[0].reason).toMatchObject({ status: 409, message: "Domain already in use" })

    const reservations = await prisma.domain.findMany({ where: { domain } })
    expect(reservations).toHaveLength(1)
    expect(reservations[0]).toMatchObject({ siteId: fulfilled[0].value.siteId, status: "verified" })
    expect(addProjectDomain).toHaveBeenCalledExactlyOnceWith(domain)
  }, 15000)
})
