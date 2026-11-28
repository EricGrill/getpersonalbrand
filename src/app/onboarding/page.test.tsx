// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import OnboardingPage from "./page"

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

beforeEach(() => { push.mockReset() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function enterProfile() {
  render(<OnboardingPage />)
  fireEvent.click(screen.getByRole("button", { name: /Modern/ }))
  fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
}

function enterLinks() {
  enterProfile()
  fireEvent.change(screen.getByLabelText("Your Name"), { target: { value: "Ada Lovelace" } })
  fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
}

describe("onboarding", () => {
  it("requires a name before advancing to links", () => {
    enterProfile()
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    expect(screen.getByRole("alert").textContent).toContain("Enter your name")
    expect(screen.getByLabelText("Your Name")).toBeTruthy()
  })

  it("rejects unsafe links before making a save request", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    enterLinks()
    fireEvent.change(screen.getByLabelText("Link 1 URL"), { target: { value: "javascript:alert(1)" } })
    fireEvent.click(screen.getByRole("button", { name: /Create My Site/ }))
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy())
    expect(fetch).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it("keeps user inputs after a failed save and supports retry", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Too many requests. Please try again." }) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal("fetch", fetch)
    enterLinks()
    fireEvent.change(screen.getByLabelText("Link 1 URL"), { target: { value: "https://example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /Create My Site/ }))
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Too many requests"))
    expect((screen.getByLabelText("Link 1 URL") as HTMLInputElement).value).toBe("https://example.com")
    expect(push).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /Create My Site/ }))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/editor"))
    expect(screen.getByText("Your site is published!")).toBeTruthy()
    const payload = JSON.parse(fetch.mock.calls[1][1].body)
    expect(payload.blocks.find((block: { type: string }) => block.type === "hero").data.name).toBe("Ada Lovelace")
    expect(payload.blocks.find((block: { type: string }) => block.type === "links").data.links[0].url).toBe("https://example.com/")
    expect(payload.siteId).toBeUndefined()
  })

  it("reports network errors without losing the current step", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")))
    enterLinks()
    fireEvent.click(screen.getByRole("button", { name: /Create My Site/ }))
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Network unavailable"))
    expect(screen.getByRole("button", { name: /Create My Site/ }).hasAttribute("disabled")).toBe(false)
  })
})
