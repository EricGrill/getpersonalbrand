import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  addProjectDomain, dnsRecords, domainsConfigured, getDomainConfig,
  getProjectDomain, removeProjectDomain, verifyProjectDomain,
} from "./vercel-domains"

const fetchMock = vi.fn<typeof fetch>()
const project = { name: "example.co.uk", apexName: "example.co.uk", projectId: "project-test", verified: false }
const config = {
  misconfigured: true,
  recommendedIPv4: [{ rank: 2, value: ["192.0.2.2"] }, { rank: 1, value: ["192.0.2.1", "192.0.2.3"] }],
  recommendedCNAME: [{ rank: 2, value: "alternate.example.net" }, { rank: 1, value: "tenant.example.net" }],
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  vi.stubEnv("VERCEL_TOKEN", "test-token")
  vi.stubEnv("VERCEL_PROJECT_ID", "project-test")
  vi.stubEnv("VERCEL_TEAM_ID", "team-test")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(Response.json(body, { status }))
}

function lastRequest() {
  const [input, init] = fetchMock.mock.calls.at(-1)!
  return { url: new URL(String(input)), init }
}

describe("Vercel project domain client", () => {
  it.each(["VERCEL_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_TEAM_ID"])("disables requests when %s is missing or blank", async (key) => {
    expect(domainsConfigured()).toBe(true)
    vi.stubEnv(key, "")
    expect(domainsConfigured()).toBe(false)
    vi.stubEnv(key, "   ")
    expect(domainsConfigured()).toBe(false)
    await expect(addProjectDomain("example.co.uk")).rejects.toMatchObject({ status: 503, code: "not_configured" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("adds a project-scoped domain with server authentication and no force reassignment", async () => {
    respond(project)
    await expect(addProjectDomain(project.name)).resolves.toEqual(project)
    const { url, init } = lastRequest()
    expect(url.origin).toBe("https://api.vercel.com")
    expect(url.pathname).toBe("/v10/projects/project-test/domains")
    expect(url.searchParams.get("teamId")).toBe("team-test")
    expect(init).toMatchObject({ method: "POST", cache: "no-store", body: JSON.stringify({ name: project.name }) })
    expect(init?.headers).toEqual({ Authorization: "Bearer test-token", "Content-Type": "application/json" })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it("reads the project domain using encoded project and domain path segments", async () => {
    vi.stubEnv("VERCEL_PROJECT_ID", "project/with space")
    respond(project)
    await getProjectDomain(project.name)
    const { url, init } = lastRequest()
    expect(url.pathname).toBe("/v9/projects/project%2Fwith%20space/domains/example.co.uk")
    expect(url.searchParams.get("teamId")).toBe("team-test")
    expect(init?.method).toBe("GET")
  })

  it("requests DNS recommendations for this project and team", async () => {
    respond(config)
    await expect(getDomainConfig(project.name)).resolves.toEqual(config)
    const { url } = lastRequest()
    expect(url.pathname).toBe("/v6/domains/example.co.uk/config")
    expect(url.searchParams.get("projectIdOrName")).toBe("project-test")
    expect(url.searchParams.get("teamId")).toBe("team-test")
  })

  it("posts ownership verification and accepts a response without challenges", async () => {
    respond({ ...project, verified: true })
    await expect(verifyProjectDomain(project.name)).resolves.toMatchObject({ verified: true })
    const { url, init } = lastRequest()
    expect(url.pathname).toBe("/v9/projects/project-test/domains/example.co.uk/verify")
    expect(init?.method).toBe("POST")
  })

  it("removes only the project assignment without requiring a JSON body", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(removeProjectDomain(project.name)).resolves.toBeUndefined()
    const { url, init } = lastRequest()
    expect(url.pathname).toBe("/v9/projects/project-test/domains/example.co.uk")
    expect(url.searchParams.get("teamId")).toBe("team-test")
    expect(init?.method).toBe("DELETE")
  })

  it("allows a removal retry after the remote assignment is already absent", async () => {
    respond({ error: { code: "not_found" } }, 404)
    respond({ id: "project-test", accountId: "team-test" })
    respond({ error: { code: "not_found" } }, 404)
    await expect(removeProjectDomain(project.name)).resolves.toBeUndefined()
    expect(new URL(String(fetchMock.mock.calls[1][0])).pathname).toBe("/v9/projects/project-test")
  })

  it("does not treat a missing project as a removed domain", async () => {
    respond({ error: { code: "not_found" } }, 404)
    respond({ error: { code: "not_found" } }, 404)
    await expect(removeProjectDomain(project.name)).rejects.toMatchObject({ status: 404 })
  })

  it("rejects an unexpected project identity while confirming absence", async () => {
    respond({ error: { code: "not_found" } }, 404)
    respond({ id: "different-project", accountId: "team-test" })
    await expect(removeProjectDomain(project.name)).rejects.toMatchObject({ code: "project_mismatch" })
  })

  it("does not confirm removal if the domain still exists", async () => {
    respond({ error: { code: "not_found" } }, 404)
    respond({ id: "project-test", accountId: "team-test" })
    respond(project)
    await expect(removeProjectDomain(project.name)).rejects.toMatchObject({ code: "removal_unconfirmed" })
  })

  it("does not turn an unstructured 404 into success", async () => {
    respond({}, 404)
    await expect(removeProjectDomain(project.name)).rejects.toMatchObject({ status: 404 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("does not hide remote removal failures", async () => {
    respond({ error: { code: "forbidden" } }, 403)
    await expect(removeProjectDomain(project.name)).rejects.toMatchObject({ status: 403, code: "forbidden" })
  })

  it("preserves provider error codes without exposing provider messages", async () => {
    respond({ error: { code: "domain_already_in_use", message: "private account information" } }, 409)
    await expect(addProjectDomain(project.name)).rejects.toMatchObject({ status: 409, code: "domain_already_in_use" })
    respond({ error: { code: "forbidden", message: "private account information" } }, 403)
    await expect(addProjectDomain(project.name)).rejects.not.toThrow("private account information")
  })

  it("returns a safe error for timeouts or network failures", async () => {
    fetchMock.mockRejectedValueOnce(new Error("transport details"))
    await expect(getProjectDomain(project.name)).rejects.toMatchObject({ status: 502, code: "unavailable" })
  })

  it.each([
    { ...config, misconfigured: "false" },
    { recommendedIPv4: [], recommendedCNAME: [] },
    { misconfigured: false },
  ])("rejects malformed configuration instead of treating it as verified", async (payload) => {
    respond(payload)
    await expect(getDomainConfig(project.name)).rejects.toMatchObject({ status: 502, code: "invalid_response" })
  })

  it("rejects malformed ownership verification", async () => {
    respond({ ...project, verified: "true" })
    await expect(verifyProjectDomain(project.name)).rejects.toMatchObject({ status: 502, code: "invalid_response" })
  })

  it("rejects successful responses containing invalid JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 200 }))
    await expect(getProjectDomain(project.name)).rejects.toMatchObject({ status: 502, code: "invalid_response" })
  })
})

describe("DNS instructions", () => {
  it("uses the preferred returned A address for an apex with a multi-label suffix", () => {
    expect(dnsRecords(project, config)).toEqual([{ type: "A", name: "example.co.uk", value: "192.0.2.1" }])
  })

  it("uses the preferred returned CNAME for a subdomain and exact TXT challenge", () => {
    expect(dnsRecords({
      ...project, name: "www.example.co.uk",
      verification: [{ type: "TXT", domain: "_vercel.example.co.uk", value: "vc-domain-verify=exact-value", reason: "pending" }],
    }, config)).toEqual([
      { type: "CNAME", name: "www.example.co.uk", value: "tenant.example.net" },
      { type: "TXT", name: "_vercel.example.co.uk", value: "vc-domain-verify=exact-value" },
    ])
  })

  it("does not invent DNS destinations when Vercel has no recommendations", () => {
    expect(dnsRecords(project, { misconfigured: true, recommendedIPv4: [], recommendedCNAME: [] })).toEqual([])
  })
})
