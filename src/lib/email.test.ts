import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { emailConfigured, sendEmail } from "./email"

const message = { to: "reader@example.com", subject: "Hello", text: "Private body" }

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", undefined)
  vi.stubEnv("EMAIL_FROM", undefined)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("email", () => {
  it("does not send without configuration or log message details", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    expect(emailConfigured()).toBe(false)
    expect(await sendEmail(message)).toEqual({ sent: false })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith("Email delivery is not configured; message was not sent.")
  })

  it("requires a sender as well as an API key", () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    expect(emailConfigured()).toBe(false)
    vi.stubEnv("EMAIL_FROM", "sender@example.com")
    expect(emailConfigured()).toBe(true)
  })

  it("sends the documented request through fetch", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("EMAIL_FROM", "sender@example.com")
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)
    expect(await sendEmail({ ...message, html: "<p>Hello</p>" })).toEqual({ sent: true })
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer test-key", "Content-Type": "application/json" },
      body: JSON.stringify({ from: "sender@example.com", ...message, html: "<p>Hello</p>" }),
    })
  })

  it("surfaces provider errors without exposing their body", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("EMAIL_FROM", "sender@example.com")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await expect(sendEmail(message)).rejects.toThrow("Email delivery failed (HTTP 429).")
  })

  it("surfaces network failures", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("EMAIL_FROM", "sender@example.com")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")))
    await expect(sendEmail(message)).rejects.toThrow("Network unavailable")
  })
})
