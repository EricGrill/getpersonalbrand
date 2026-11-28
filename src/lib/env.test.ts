import { afterEach, describe, expect, it, vi } from "vitest"
import { getEnv, parseEnv } from "./env"

const required = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  NEXTAUTH_SECRET: "test-only-secret",
}

afterEach(() => vi.unstubAllEnvs())

describe("environment", () => {
  it("accepts missing optional services and supplies public defaults", () => {
    const env = parseEnv(required)
    expect(env.NEXT_PUBLIC_APP_DOMAIN).toBe("getpersonalbrand.com")
    expect(env.NEXT_PUBLIC_SITE_URL_MODE).toBe("path")
    expect(env.ADMIN_EMAILS).toEqual([])
    expect(env.RESEND_API_KEY).toBeUndefined()
  })

  it("requires database and auth settings when explicitly parsed", () => {
    expect(() => parseEnv({})).toThrow()
    expect(() => parseEnv({ ...required, DATABASE_URL: "invalid" })).toThrow()
    expect(() => parseEnv({ ...required, NEXTAUTH_SECRET: "" })).toThrow()
  })

  it("rejects unsupported URL modes", () => {
    expect(() => parseEnv({ ...required, NEXT_PUBLIC_SITE_URL_MODE: "other" })).toThrow()
  })

  it("normalizes the admin email list and blank optional values", () => {
    const env = parseEnv({
      ...required,
      ADMIN_EMAILS: " Eric@Example.com, , other@example.com ",
      RESEND_API_KEY: "",
      NEXTAUTH_URL: "",
    })
    expect(env.ADMIN_EMAILS).toEqual(["eric@example.com", "other@example.com"])
    expect(env.RESEND_API_KEY).toBeUndefined()
    expect(env.NEXTAUTH_URL).toBeUndefined()
  })

  it("parses the current process environment lazily", () => {
    vi.stubEnv("DATABASE_URL", required.DATABASE_URL)
    vi.stubEnv("NEXTAUTH_SECRET", required.NEXTAUTH_SECRET)
    expect(getEnv().NEXTAUTH_SECRET).toBe(required.NEXTAUTH_SECRET)
  })
})
