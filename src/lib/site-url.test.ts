import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { appUrl, siteHost, siteUrl } from "./site-url"

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_DOMAIN", undefined)
  vi.stubEnv("NEXT_PUBLIC_SITE_URL_MODE", undefined)
})
afterEach(() => vi.unstubAllEnvs())

describe("site URLs", () => {
  it.each(["\n//evil.example/payload", "\t\\\\evil.example/payload", "/\r/evil.example"])(
    "rejects control characters that could change the URL origin",
    (path) => expect(() => appUrl(path)).toThrow("control characters"),
  )

  it("defaults to the canonical app and path-based site URLs", () => {
    expect(appUrl()).toBe("https://getpersonalbrand.com")
    expect(appUrl("dashboard")).toBe("https://getpersonalbrand.com/dashboard")
    expect(siteUrl("alice")).toBe("https://getpersonalbrand.com/site/alice")
    expect(siteHost("alice")).toBe("getpersonalbrand.com")
  })

  it("uses the configured subdomain mode", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL_MODE", "subdomain")
    expect(siteUrl("alice")).toBe("https://alice.getpersonalbrand.com")
    expect(siteHost("alice")).toBe("alice.getpersonalbrand.com")
  })

  it("supports local development with a port", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DOMAIN", "localhost:3000")
    expect(appUrl()).toBe("http://localhost:3000")
    expect(siteUrl("alice")).toBe("http://localhost:3000/site/alice")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL_MODE", "subdomain")
    expect(siteUrl("alice")).toBe("http://alice.localhost:3000")
    expect(siteHost("alice")).toBe("alice.localhost:3000")
  })

  it("supports preview hosts and keeps path arguments on the app origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DOMAIN", "preview.example.com")
    expect(siteUrl("alice")).toBe("https://preview.example.com/site/alice")
    expect(appUrl("//other.example/dashboard")).toBe("https://preview.example.com/other.example/dashboard")
    expect(appUrl("/\\other.example/dashboard")).toBe("https://preview.example.com/other.example/dashboard")
    expect(appUrl("/login?next=dashboard#form")).toBe("https://preview.example.com/login?next=dashboard#form")
  })
})
