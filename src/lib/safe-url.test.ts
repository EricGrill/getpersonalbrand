import { describe, expect, it } from "vitest"
import { safeHref } from "./safe-url"

describe("safeHref", () => {
  it.each([
    [" HTTPS://Example.COM/hello world ", "https://example.com/hello%20world"],
    ["http://example.com", "http://example.com/"],
    ["mailto:hello@example.com?subject=Hello", "mailto:hello@example.com?subject=Hello"],
  ])("normalizes allowed URL %s", (input, expected) => {
    expect(safeHref(input)).toBe(expected)
  })

  it.each([
    "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,test", "file:///tmp/test",
    "ftp://example.com", "/relative", "//example.com", "not a URL", "mailto:",
    "java\nscript:alert(1)", "https://example.com\n", "", null, undefined,
  ])("rejects unsafe or invalid value %s", (input) => {
    expect(safeHref(input)).toBeNull()
  })
})
