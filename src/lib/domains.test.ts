import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma, type Domain } from "@prisma/client"
import { addDomain, DomainError, normalizeDomain, releaseDomain, verifyDomain } from "./domains"
import {
  addProjectDomain, domainsConfigured, getDomainConfig, getProjectDomain,
  removeProjectDomain, VercelDomainError, verifyProjectDomain,
} from "./vercel-domains"

const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  domain: {
    findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  },
}))
const transaction = vi.hoisted(() => vi.fn())

vi.mock("./prisma", () => ({ prisma: { $transaction: transaction } }))
vi.mock("./vercel-domains", async (importOriginal) => ({
  ...await importOriginal<typeof import("./vercel-domains")>(),
  domainsConfigured: vi.fn(), addProjectDomain: vi.fn(), getDomainConfig: vi.fn(),
  getProjectDomain: vi.fn(), removeProjectDomain: vi.fn(), verifyProjectDomain: vi.fn(),
}))

const project = {
  name: "example.com", apexName: "example.com", projectId: "project-test", verified: false,
  verification: [{ type: "TXT", domain: "_vercel.example.com", value: "vc-domain-verify=ownership-proof", reason: "pending" }],
}
const config = {
  misconfigured: false,
  recommendedIPv4: [{ rank: 1, value: ["192.0.2.10"] }],
  recommendedCNAME: [{ rank: 1, value: "tenant.example.net" }],
}
const rows = new Map<string, Domain>()

function domainRow(overrides: Partial<Domain> = {}): Domain {
  return {
    id: "domain-1", siteId: "site-1", domain: "example.com", status: "pending_verification",
    verifiedAt: null, verification: null, lastCheckedAt: null, lastError: null,
    createdAt: new Date("2026-11-28T00:00:00Z"), ...overrides,
  }
}

function seed(overrides: Partial<Domain> = {}) {
  const row = domainRow(overrides)
  rows.set(row.id, row)
  return row
}

beforeEach(() => {
  vi.clearAllMocks()
  rows.clear()
  vi.stubEnv("NEXT_PUBLIC_APP_DOMAIN", "getpersonalbrand.com")
  vi.stubEnv("VERCEL_PROJECT_ID", "project-test")
  vi.stubEnv("VERCEL_TEAM_ID", "team-test")
  vi.mocked(domainsConfigured).mockReturnValue(true)
  vi.mocked(addProjectDomain).mockResolvedValue(project)
  vi.mocked(getProjectDomain).mockResolvedValue(project)
  vi.mocked(getDomainConfig).mockResolvedValue(config)
  vi.mocked(verifyProjectDomain).mockResolvedValue({ ...project, verified: true })
  vi.mocked(removeProjectDomain).mockResolvedValue(undefined)
  transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db))
  db.$queryRaw.mockResolvedValue([{ id: "site-1" }])
  db.domain.findUnique.mockImplementation(async ({ where }: { where: { id?: string; domain?: string } }) => {
    const row = where.id ? rows.get(where.id) : [...rows.values()].find((row) => row.domain === where.domain)
    return row ? { ...row, site: { userId: "user-1" } } : null
  })
  db.domain.count.mockImplementation(async ({ where }: { where: { siteId: string } }) =>
    [...rows.values()].filter((row) => row.siteId === where.siteId).length)
  db.domain.create.mockImplementation(async ({ data }: { data: Partial<Domain> }) => seed(data))
  db.domain.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Partial<Domain> }) => {
    const row = { ...rows.get(where.id)!, ...data }
    rows.set(where.id, row)
    return row
  })
  db.domain.delete.mockImplementation(async ({ where }: { where: { id: string } }) => {
    const row = rows.get(where.id)
    rows.delete(where.id)
    return row
  })
})

afterEach(() => vi.unstubAllEnvs())

describe("normalizeDomain", () => {
  it("normalizes case, surrounding whitespace, punycode and an absolute DNS name", () => {
    expect(normalizeDomain("  BÜCHER.Example.  ")).toBe("xn--bcher-kva.example")
    expect(normalizeDomain("WWW.Example.COM")).toBe("www.example.com")
  })

  it.each([
    "", "localhost", "https://example.com", "example.com/path", "example.com:443",
    "a@example.com", "example.com?x=1", "example.com#x", "example.com\\path",
    "example .com", "127.0.0.1", "2130706433", "[::1]", "-bad.example",
    "bad-.example", "bad..example", "bad_name.example", `${"a".repeat(64)}.example`,
    null, 42, {},
  ])("rejects invalid hostname %j", (input) => {
    expect(() => normalizeDomain(input)).toThrow(DomainError)
  })

  it.each(["getpersonalbrand.com", "x.getpersonalbrand.com", "GETPERSONALBRAND.COM."])("rejects reserved app host %s", (input) => {
    expect(() => normalizeDomain(input)).toThrow("app domain")
  })

  it("also protects the configured app domain and its subdomains", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DOMAIN", "brand.example")
    expect(() => normalizeDomain("brand.example")).toThrow("app domain")
    expect(() => normalizeDomain("tenant.brand.example")).toThrow("app domain")
    expect(normalizeDomain("notbrand.example")).toBe("notbrand.example")
  })
})

describe("domain lifecycle", () => {
  it("reserves and adds a domain, saves ownership instructions, then verifies it", async () => {
    const added = await addDomain("site-1", "user-1", "EXAMPLE.COM")
    expect(added).toMatchObject({ domain: "example.com", status: "pending_verification", verifiedAt: null })
    expect(added.verification).toMatchObject({
      project,
      records: [
        { type: "A", name: "example.com", value: "192.0.2.10" },
        { type: "TXT", name: "_vercel.example.com", value: "vc-domain-verify=ownership-proof" },
      ],
    })
    expect(addProjectDomain).toHaveBeenCalledWith("example.com")
    expect(db.domain.create.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(addProjectDomain).mock.invocationCallOrder[0])

    const verified = await verifyDomain(added.id, "user-1")
    expect(verified).toMatchObject({ status: "verified", lastError: null })
    expect(verified.verifiedAt).toBeInstanceOf(Date)
    expect(verified.lastCheckedAt).toBeInstanceOf(Date)
    expect(verifyProjectDomain).toHaveBeenCalledWith("example.com")
  })

  it("does not mark an owned but misconfigured domain verified", async () => {
    seed({ status: "verified", verifiedAt: new Date() })
    vi.mocked(getProjectDomain).mockResolvedValue({ ...project, verified: true })
    vi.mocked(getDomainConfig).mockResolvedValue({ ...config, misconfigured: true })
    const result = await verifyDomain("domain-1", "user-1")
    expect(result).toMatchObject({ status: "misconfigured", verifiedAt: null })
    expect(result.lastError).toContain("DNS is not configured correctly")
    expect(verifyProjectDomain).not.toHaveBeenCalled()
  })

  it("keeps a correctly routed domain pending when ownership is still unverified", async () => {
    seed()
    vi.mocked(verifyProjectDomain).mockResolvedValue(project)
    const result = await verifyDomain("domain-1", "user-1")
    expect(result).toMatchObject({ status: "pending_verification", verifiedAt: null })
    expect(result.lastError).toContain("Ownership verification is pending")
  })

  it("retains TXT instructions when an unverified verify response omits challenges", async () => {
    seed()
    vi.mocked(verifyProjectDomain).mockResolvedValue({
      name: project.name, apexName: project.apexName, projectId: project.projectId, verified: false,
    })
    const result = await verifyDomain("domain-1", "user-1")
    expect(result.status).toBe("pending_verification")
    expect(result.verification).toMatchObject({ records: expect.arrayContaining([
      { type: "TXT", name: "_vercel.example.com", value: "vc-domain-verify=ownership-proof" },
    ]) })
  })

  it("preserves TXT instructions when another account's ownership challenge is unmet", async () => {
    seed()
    vi.mocked(verifyProjectDomain).mockRejectedValue(new VercelDomainError(400, "verification_failed"))
    const result = await verifyDomain("domain-1", "user-1")
    expect(result).toMatchObject({ status: "pending_verification", verifiedAt: null })
    expect(result.lastError).toContain("TXT record")
    expect(result.verification).toMatchObject({ records: expect.arrayContaining([
      { type: "TXT", name: "_vercel.example.com", value: "vc-domain-verify=ownership-proof" },
    ]) })
  })

  it("keeps a failed remote registration as a removable, retryable row", async () => {
    vi.mocked(addProjectDomain).mockRejectedValueOnce(new VercelDomainError(409, "domain_already_in_use"))
    await expect(addDomain("site-1", "user-1", "example.com")).rejects.toMatchObject({
      status: 502, domain: { status: "failed", verifiedAt: null, lastError: expect.stringContaining("ownership") },
    })
    expect(rows.get("domain-1")?.status).toBe("failed")
    expect(db.domain.delete).not.toHaveBeenCalled()
  })

  it("preserves the ownership challenge if configuration retrieval fails after add", async () => {
    vi.mocked(getDomainConfig).mockRejectedValueOnce(new VercelDomainError(502, "unavailable"))
    await expect(addDomain("site-1", "user-1", "example.com")).rejects.toMatchObject({
      status: 502, domain: { verification: { records: [{ type: "TXT", name: "_vercel.example.com", value: "vc-domain-verify=ownership-proof" }] } },
    })
    expect(rows.has("domain-1")).toBe(true)
  })

  it("clears previous verification after a provider failure instead of showing stale success", async () => {
    seed({ status: "verified", verifiedAt: new Date() })
    vi.mocked(getProjectDomain).mockRejectedValueOnce(new VercelDomainError(503, "unavailable"))
    await expect(verifyDomain("domain-1", "user-1")).rejects.toMatchObject({ status: 502 })
    expect(rows.get("domain-1")).toMatchObject({ status: "failed", verifiedAt: null, lastError: expect.any(String) })
  })

  it("recovers a legacy or interrupted registration missing from Vercel", async () => {
    seed()
    vi.mocked(getProjectDomain).mockRejectedValueOnce(new VercelDomainError(404, "not_found"))
    await expect(verifyDomain("domain-1", "user-1")).resolves.toMatchObject({ status: "verified" })
    expect(addProjectDomain).toHaveBeenCalledWith("example.com")
  })

  it("rejects a domain held by another site before calling Vercel", async () => {
    seed({ siteId: "other-site" })
    await expect(addDomain("site-1", "user-1", "example.com")).rejects.toMatchObject({ status: 409, message: "Domain already in use" })
    expect(addProjectDomain).not.toHaveBeenCalled()
    expect(db.domain.create).not.toHaveBeenCalled()
  })

  it("rejects a third domain including pending and failed reservations", async () => {
    seed({ id: "domain-1", domain: "first.example", status: "failed" })
    seed({ id: "domain-2", domain: "second.example" })
    await expect(addDomain("site-1", "user-1", "third.example")).rejects.toMatchObject({ status: 409, message: expect.stringContaining("at most 2") })
    expect(addProjectDomain).not.toHaveBeenCalled()
    expect(db.domain.create).not.toHaveBeenCalled()
  })

  it("maps a competing site's unique-constraint reservation to a conflict", async () => {
    db.domain.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "5.22.0" }))
    await expect(addDomain("site-1", "user-1", "example.com")).rejects.toMatchObject({ status: 409, message: "Domain already in use" })
    expect(addProjectDomain).not.toHaveBeenCalled()
  })

  it("rejects adding to a site the user does not own", async () => {
    db.$queryRaw.mockResolvedValueOnce([])
    await expect(addDomain("other-site", "user-1", "example.com")).rejects.toMatchObject({ status: 404 })
    expect(addProjectDomain).not.toHaveBeenCalled()
    expect(db.domain.create).not.toHaveBeenCalled()
  })

  it.each([verifyDomain, releaseDomain])("rejects access to another user's domain", async (operation) => {
    seed()
    await expect(operation("domain-1", "other-user")).rejects.toMatchObject({ status: 404 })
    expect(getProjectDomain).not.toHaveBeenCalled()
    expect(removeProjectDomain).not.toHaveBeenCalled()
    expect(db.domain.update).not.toHaveBeenCalled()
    expect(db.domain.delete).not.toHaveBeenCalled()
  })

  it("does not mutate anything when domains are not configured", async () => {
    vi.mocked(domainsConfigured).mockReturnValue(false)
    for (const operation of [
      () => addDomain("site-1", "user-1", "example.com"),
      () => verifyDomain("domain-1", "user-1"),
      () => releaseDomain("domain-1", "user-1"),
    ]) {
      await expect(operation()).rejects.toMatchObject({ status: 503, message: "Custom domains are not available yet" })
    }
    expect(transaction).not.toHaveBeenCalled()
    expect(addProjectDomain).not.toHaveBeenCalled()
    expect(removeProjectDomain).not.toHaveBeenCalled()
  })

  it("removes the remote assignment before deleting its local row", async () => {
    seed()
    await expect(releaseDomain("domain-1", "user-1")).resolves.toBeUndefined()
    expect(removeProjectDomain).toHaveBeenCalledWith("example.com")
    expect(db.domain.delete.mock.invocationCallOrder[0]).toBeGreaterThan(vi.mocked(removeProjectDomain).mock.invocationCallOrder[0])
    expect(rows.has("domain-1")).toBe(false)
  })

  it("retains the row and records the error when remote removal fails", async () => {
    seed()
    vi.mocked(removeProjectDomain).mockRejectedValueOnce(new VercelDomainError(403, "forbidden"))
    await expect(releaseDomain("domain-1", "user-1")).rejects.toMatchObject({ status: 502 })
    expect(db.domain.delete).not.toHaveBeenCalled()
    expect(rows.get("domain-1")?.lastError).toContain("Vercel")
  })

  it("supports trusted account cleanup by domain ID", async () => {
    seed()
    await expect(releaseDomain("domain-1")).resolves.toBeUndefined()
    expect(rows.size).toBe(0)
  })

  it.each(["projectId", "teamId"])("retains registrations when the configured %s changes", async (key) => {
    seed({ verification: { projectId: "project-test", teamId: "team-test", [key]: "original-value" } })
    await expect(releaseDomain("domain-1", "user-1")).rejects.toMatchObject({ status: 503 })
    await expect(verifyDomain("domain-1", "user-1")).rejects.toMatchObject({ status: 503 })
    expect(removeProjectDomain).not.toHaveBeenCalled()
    expect(getProjectDomain).not.toHaveBeenCalled()
    expect(db.domain.delete).not.toHaveBeenCalled()
  })
})
