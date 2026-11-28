import { beforeEach, describe, expect, it, vi } from "vitest"
import { getServerSession } from "next-auth"
import { addDomain, DomainError, releaseDomain, verifyDomain } from "@/lib/domains"
import { domainsConfigured } from "@/lib/vercel-domains"
import { rateLimit } from "@/lib/rate-limit"
import { POST as add } from "./add/route"
import { POST as verify } from "./verify/route"
import { POST as remove } from "./remove/route"
import { GET as config } from "./config/route"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }))
vi.mock("@/lib/vercel-domains", () => ({ domainsConfigured: vi.fn() }))
vi.mock("@/lib/domains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domains")>()
  return { ...actual, addDomain: vi.fn(), verifyDomain: vi.fn(), releaseDomain: vi.fn() }
})

function request(body: unknown) {
  return new Request("http://localhost/api/domains", { method: "POST", body: JSON.stringify(body) })
}

const row = { id: "domain-1", domain: "example.com", status: "pending_verification" }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } })
  vi.mocked(domainsConfigured).mockReturnValue(true)
  vi.mocked(rateLimit).mockResolvedValue({ ok: true, remaining: 9 })
  vi.mocked(addDomain).mockResolvedValue(row as never)
  vi.mocked(verifyDomain).mockResolvedValue({ ...row, status: "verified" } as never)
})

const operations = [
  { name: "add", route: add, body: { siteId: "site-1", domain: "example.com" } },
  { name: "verify", route: verify, body: { domainId: "domain-1" } },
  { name: "remove", route: remove, body: { domainId: "domain-1" } },
]

describe.each(operations)("$name route", ({ route, body }) => {
  it("requires an authenticated user before any operations", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await route(request(body))).status).toBe(401)
    expect(addDomain).not.toHaveBeenCalled()
    expect(verifyDomain).not.toHaveBeenCalled()
    expect(releaseDomain).not.toHaveBeenCalled()
  })

  it("never fakes success when Vercel is not configured", async () => {
    vi.mocked(domainsConfigured).mockReturnValue(false)
    const response = await route(request(body))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "Custom domains are not available yet" })
    expect(addDomain).not.toHaveBeenCalled()
    expect(verifyDomain).not.toHaveBeenCalled()
    expect(releaseDomain).not.toHaveBeenCalled()
  })

  it.each([null, {}, { domainId: 42, siteId: 42, domain: [] }])("rejects an invalid body %j", async (invalid) => {
    expect((await route(request(invalid))).status).toBe(400)
  })

  it("rejects malformed JSON", async () => {
    const response = await route(new Request("http://localhost/api/domains", { method: "POST", body: "{" }))
    expect(response.status).toBe(400)
  })

  it("returns ownership errors from the service", async () => {
    const forbidden = new DomainError("Domain not found", 404)
    vi.mocked(addDomain).mockRejectedValue(forbidden)
    vi.mocked(verifyDomain).mockRejectedValue(forbidden)
    vi.mocked(releaseDomain).mockRejectedValue(forbidden)
    expect((await route(request(body))).status).toBe(404)
  })
})

it("returns only the configuration flag with no cache", async () => {
  vi.mocked(domainsConfigured).mockReturnValue(false)
  const response = await config()
  expect(await response.json()).toEqual({ configured: false })
  expect(response.headers.get("Cache-Control")).toBe("no-store")
  vi.mocked(getServerSession).mockResolvedValue(null)
  expect((await config()).status).toBe(401)
})

it("adds through the service with the session's user ID", async () => {
  const response = await add(request({ siteId: "site-1", domain: "example.com", userId: "attacker" }))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ domain: row })
  expect(addDomain).toHaveBeenCalledWith("site-1", "user-1", "example.com")
  expect(rateLimit).toHaveBeenCalledWith({ key: "domains:add:user-1", limit: 10, windowSeconds: 3600 })
})

it("returns updated records and status on check again", async () => {
  const response = await verify(request({ domainId: "domain-1" }))
  expect(await response.json()).toEqual({ domain: { ...row, status: "verified" }, status: "verified" })
  expect(verifyDomain).toHaveBeenCalledWith("domain-1", "user-1")
  expect(rateLimit).toHaveBeenCalledWith({ key: "domains:verify:user-1", limit: 30, windowSeconds: 3600 })
})

it.each(operations.slice(0, 2))("rate limits $name before calling Vercel", async ({ route, body }) => {
  vi.mocked(rateLimit).mockResolvedValue({ ok: false, remaining: 0 })
  expect((await route(request(body))).status).toBe(429)
  expect(addDomain).not.toHaveBeenCalled()
  expect(verifyDomain).not.toHaveBeenCalled()
})

it("fails closed when rate limiting is unavailable", async () => {
  vi.mocked(rateLimit).mockRejectedValue(new Error("database unavailable"))
  expect((await add(request({ siteId: "site-1", domain: "example.com" }))).status).toBe(500)
  expect(addDomain).not.toHaveBeenCalled()
})

it("returns a retained failed registration for retry and removal", async () => {
  const failed = { ...row, status: "failed", lastError: "Vercel is unavailable" }
  vi.mocked(addDomain).mockRejectedValue(new DomainError(failed.lastError, 502, failed as never))
  const response = await add(request({ siteId: "site-1", domain: "example.com" }))
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({ error: failed.lastError, domain: failed })
})

it("passes the session user to releaseDomain and returns success only after completion", async () => {
  const response = await remove(request({ domainId: "domain-1", userId: "attacker" }))
  expect(await response.json()).toEqual({ success: true })
  expect(releaseDomain).toHaveBeenCalledWith("domain-1", "user-1")
  vi.mocked(releaseDomain).mockRejectedValue(new DomainError("Removal failed", 502))
  expect((await remove(request({ domainId: "domain-1" }))).status).toBe(502)
})
