// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DomainManager } from "./domain-manager"

const domain = {
  id: "domain-1",
  domain: "example.com",
  status: "pending_verification",
  verifiedAt: null,
  lastError: null,
  verification: {
    records: [
      { type: "A", name: "example.com", value: "192.0.2.7" },
      { type: "TXT", name: "_vercel.example.com", value: "vc-domain-verify=example.com,challenge" },
    ],
  },
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValueOnce(response({ configured: true }))
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(window, "confirm").mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("DomainManager", () => {
  it("hides the form while loading and when domains are not configured", async () => {
    let resolveConfiguration!: (value: Response) => void
    fetchMock.mockReset().mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveConfiguration = resolve
    }))
    render(<DomainManager siteId="site-1" domains={[]} />)

    expect(screen.getByRole("status").textContent).toContain("Checking custom domain availability")
    expect(screen.queryByRole("textbox")).toBeNull()
    resolveConfiguration(response({ configured: false }))

    expect(await screen.findByText("Custom domains are not available yet")).toBeTruthy()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("reports configuration failure without exposing the form", async () => {
    fetchMock.mockReset().mockRejectedValueOnce(new Error("Network unavailable"))
    render(<DomainManager siteId="site-1" domains={[]} />)

    expect((await screen.findByRole("alert")).textContent).toContain("Could not check custom domain availability")
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("shows the exact A, CNAME and TXT records, status and last error", async () => {
    render(<DomainManager siteId="site-1" domains={[
      { ...domain, status: "misconfigured", lastError: "DNS does not point to the project" },
      {
        ...domain,
        id: "domain-2",
        domain: "www.example.com",
        verification: { records: [{ type: "CNAME", name: "www.example.com", value: "project-specific.vercel-dns.com" }] },
      },
    ]} />)

    expect(await screen.findByText("Misconfigured")).toBeTruthy()
    expect(screen.getByText("Last error: DNS does not point to the project")).toBeTruthy()
    for (const value of ["A", "192.0.2.7", "TXT", "_vercel.example.com", "vc-domain-verify=example.com,challenge", "CNAME", "project-specific.vercel-dns.com"]) {
      expect(screen.getByText(value)).toBeTruthy()
    }
    expect((screen.getByRole("button", { name: "Add Domain" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText("Domain name") as HTMLInputElement).disabled).toBe(true)
  })

  it("adds a domain and displays its returned instructions", async () => {
    fetchMock.mockResolvedValueOnce(response({ domain }))
    render(<DomainManager siteId="site-1" domains={[]} />)
    await userEvent.type(await screen.findByLabelText("Domain name"), "example.com")
    await userEvent.click(screen.getByRole("button", { name: "Add Domain" }))

    expect(await screen.findByText("192.0.2.7")).toBeTruthy()
    expect(fetchMock).toHaveBeenLastCalledWith("/api/domains/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: "site-1", domain: "example.com" }),
    })
    expect((screen.getByLabelText("Domain name") as HTMLInputElement).value).toBe("")
  })

  it("reports add errors and keeps the input for correction", async () => {
    fetchMock.mockResolvedValueOnce(response({ error: "Domain already in use" }, 409))
    render(<DomainManager siteId="site-1" domains={[]} />)
    await userEvent.type(await screen.findByLabelText("Domain name"), "example.com")
    await userEvent.click(screen.getByRole("button", { name: "Add Domain" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Domain already in use")
    expect((screen.getByLabelText("Domain name") as HTMLInputElement).value).toBe("example.com")
  })

  it("keeps a reserved domain visible when setup fails so it can be retried or removed", async () => {
    fetchMock.mockResolvedValueOnce(response({
      error: "Domain setup failed",
      domain: { ...domain, status: "failed", lastError: "Vercel is unavailable" },
    }, 502))
    render(<DomainManager siteId="site-1" domains={[]} />)
    await userEvent.type(await screen.findByLabelText("Domain name"), "example.com")
    await userEvent.click(screen.getByRole("button", { name: "Add Domain" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Domain setup failed")
    expect(screen.getByText("Failed")).toBeTruthy()
    expect(screen.getByText("Last error: Vercel is unavailable")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Check again for example.com" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Remove example.com" })).toBeTruthy()
  })

  it("refreshes records and clears stale errors when verification succeeds", async () => {
    fetchMock.mockResolvedValueOnce(response({ domain: {
      ...domain,
      status: "verified",
      lastError: null,
      verification: { records: [{ type: "A", name: "example.com", value: "192.0.2.8" }] },
    }, status: "verified" }))
    render(<DomainManager siteId="site-1" domains={[{ ...domain, lastError: "Previous DNS error" }]} />)
    await userEvent.click(await screen.findByRole("button", { name: "Check again for example.com" }))

    expect(await screen.findByText("Verified")).toBeTruthy()
    expect(screen.getByText("192.0.2.8")).toBeTruthy()
    expect(screen.queryByText("192.0.2.7")).toBeNull()
    expect(screen.queryByText("Last error: Previous DNS error")).toBeNull()
    expect(screen.getByRole("button", { name: "Check again for example.com" })).toBeTruthy()
  })

  it("updates a previously verified domain and displays a verification failure", async () => {
    fetchMock.mockResolvedValueOnce(response({
      error: "Unable to verify domain",
      domain: { ...domain, status: "failed", lastError: "Domain ownership must be proven" },
    }, 502))
    render(<DomainManager siteId="site-1" domains={[{ ...domain, status: "verified" }]} />)
    await userEvent.click(await screen.findByRole("button", { name: "Check again for example.com" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Unable to verify domain")
    expect(screen.getByText("Failed")).toBeTruthy()
    expect(screen.getByText("Last error: Domain ownership must be proven")).toBeTruthy()
  })

  it("reports verification network errors without dropping the domain", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network unavailable"))
    render(<DomainManager siteId="site-1" domains={[domain]} />)
    await userEvent.click(await screen.findByRole("button", { name: "Check again for example.com" }))

    expect((await screen.findByRole("alert")).textContent).toContain("Failed to check domain")
    expect(screen.getByText("Pending")).toBeTruthy()
  })

  it("keeps a domain on removal failure and removes it only after success", async () => {
    fetchMock.mockResolvedValueOnce(response({ error: "Vercel is unavailable" }, 502))
    fetchMock.mockResolvedValueOnce(response({ success: true }))
    render(<DomainManager siteId="site-1" domains={[domain]} />)
    await userEvent.click(await screen.findByRole("button", { name: "Remove example.com" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Vercel is unavailable")
    expect(screen.getByRole("button", { name: "Remove example.com" })).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Remove example.com" }))

    await waitFor(() => expect(screen.queryByRole("button", { name: "Remove example.com" })).toBeNull())
    expect(screen.queryByRole("alert")).toBeNull()
    expect(fetchMock).toHaveBeenLastCalledWith("/api/domains/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId: "domain-1" }),
    })
  })

  it("leaves the domain alone when removal is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    render(<DomainManager siteId="site-1" domains={[domain]} />)
    await userEvent.click(await screen.findByRole("button", { name: "Remove example.com" }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Remove example.com" })).toBeTruthy()
  })
})
