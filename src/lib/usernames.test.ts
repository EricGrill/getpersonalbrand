import { describe, expect, it } from "vitest"
import { normalizeUsername, RESERVED_USERNAMES, validateUsername } from "./usernames"

describe("usernames", () => {
  it("normalizes whitespace and case without silently deleting invalid characters", () => {
    expect(normalizeUsername(" Alice-Smith ")).toBe("alice-smith")
    expect(normalizeUsername("Alice Smith")).toBe("alice smith")
  })

  it.each(["alice", "alice-smith", "abc", "a".repeat(30), "123"])("accepts %s", (value) => {
    expect(validateUsername(value)).toEqual({ ok: true })
  })

  it.each(["", "ab", "a".repeat(31), "-alice", "alice-", "a_b", "a.b", "a b", "élice"])("rejects invalid value %s", (value) => {
    expect(validateUsername(value)).toEqual({ ok: false, error: expect.any(String) })
  })

  it("rejects every reserved username, including www and normalized variants", () => {
    for (const name of RESERVED_USERNAMES) expect(validateUsername(name).ok).toBe(false)
    expect(validateUsername(" WWW ").ok).toBe(false)
  })
})
