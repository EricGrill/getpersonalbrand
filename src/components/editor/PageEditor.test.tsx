// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PageEditor } from "./PageEditor"
import { Block, DEFAULT_THEME } from "@/types/blocks"

const hero: Block = { id: "hero", type: "hero", data: { name: "Initial name", headline: "Headline", bio: "Bio", imageUrl: null } }
const about: Block = { id: "about", type: "about", data: { title: "About", content: "My story" } }
const props = () => ({ initialBlocks: [hero, about], initialTheme: DEFAULT_THEME,
  initialPublishedBlocks: [hero, about], initialPublishedTheme: DEFAULT_THEME,
  isPublished: true, onSave: vi.fn().mockResolvedValue(undefined), onPublish: vi.fn().mockResolvedValue(undefined),
  onPreview: vi.fn(), onDraftPreview: vi.fn().mockReturnValue({ navigate: vi.fn(), close: vi.fn() }), username: "test" })

beforeEach(() => vi.useFakeTimers())
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

async function tick(milliseconds = 1000) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds) })
}

function rename(name: string) {
  fireEvent.change(screen.getByPlaceholderText("Your Name"), { target: { value: name } })
}

describe("PageEditor draft workflow", () => {
  it("debounces edits and shows saved status without publishing", async () => {
    const options = props()
    render(<PageEditor {...options} />)
    rename("First edit")
    expect(screen.getByRole("status", { name: "Draft save status" }).textContent).toBe("Unsaved changes")
    await tick(600)
    rename("Latest edit")
    await tick(600)
    expect(options.onSave).not.toHaveBeenCalled()
    await tick(400)
    expect(options.onSave).toHaveBeenCalledTimes(1)
    expect(options.onSave.mock.calls[0][0][0].data.name).toBe("Latest edit")
    expect(options.onPublish).not.toHaveBeenCalled()
    expect(screen.getByRole("status", { name: "Draft save status" }).textContent).toBe("Saved")
    expect(screen.getByText("You have unpublished changes")).toBeTruthy()
  })

  it("keeps edits made during an in-flight save dirty and saves them next", async () => {
    let resolve!: () => void
    const options = props()
    options.onSave.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done }))
    render(<PageEditor {...options} />)
    rename("Saved version")
    await tick()
    expect(screen.getByRole("status", { name: "Draft save status" }).textContent).toBe("Saving")
    rename("Newer edit")
    await act(async () => resolve())
    expect(screen.getByRole("status", { name: "Draft save status" }).textContent).toBe("Unsaved changes")
    await tick()
    expect(options.onSave).toHaveBeenCalledTimes(2)
    expect(options.onSave.mock.calls[1][0][0].data.name).toBe("Newer edit")
    expect(screen.getByRole("status", { name: "Draft save status" }).textContent).toBe("Saved")
  })

  it("reports failed autosave, preserves the leave warning, and permits retry", async () => {
    const options = props()
    options.onSave.mockRejectedValueOnce(new Error("Invalid URL"))
    render(<PageEditor {...options} />)
    rename("New name")
    await tick()
    expect(screen.getByRole("alert").textContent).toBe("Invalid URL")
    expect(screen.getByRole("status", { name: "Draft save status" }).textContent).toBe("Unsaved changes")
    const event = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })))
    expect(screen.getByRole("status", { name: "Draft save status" }).textContent).toBe("Saved")
    const savedEvent = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(savedEvent)
    expect(savedEvent.defaultPrevented).toBe(false)
  })

  it("saves the current draft before publishing and clears unpublished status", async () => {
    const options = props()
    render(<PageEditor {...options} />)
    rename("Publish this")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })))
    expect(options.onSave).toHaveBeenCalledTimes(1)
    expect(options.onPublish).toHaveBeenCalledWith(true)
    expect(options.onSave.mock.invocationCallOrder[0]).toBeLessThan(options.onPublish.mock.invocationCallOrder[0])
    expect(screen.queryByText("You have unpublished changes")).toBeNull()
  })

  it("does not publish or open draft preview after a failed save", async () => {
    const options = props()
    options.onSave.mockRejectedValue(new Error("Invalid URL"))
    render(<PageEditor {...options} />)
    rename("Invalid draft")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })))
    expect(options.onPublish).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Draft preview" })))
    const preview = options.onDraftPreview.mock.results[0].value
    expect(preview.navigate).not.toHaveBeenCalled()
    expect(preview.close).toHaveBeenCalledTimes(1)
  })

  it("saves before draft preview and keeps a separate unpublish action", async () => {
    const options = props()
    render(<PageEditor {...options} />)
    rename("Preview draft")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Draft preview" })))
    expect(options.onDraftPreview).toHaveBeenCalledTimes(1)
    const preview = options.onDraftPreview.mock.results[0].value
    expect(options.onDraftPreview.mock.invocationCallOrder[0]).toBeLessThan(options.onSave.mock.invocationCallOrder[0])
    expect(options.onSave.mock.invocationCallOrder[0]).toBeLessThan(preview.navigate.mock.invocationCallOrder[0])
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Unpublish" })))
    expect(options.onPublish).toHaveBeenCalledWith(false)
  })

  it("keeps newer edits unpublished when they arrive during a publish request", async () => {
    let resolve!: () => void
    const options = props()
    options.onPublish.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done }))
    render(<PageEditor {...options} />)
    rename("Published version")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })))
    rename("Next draft")
    await tick()
    expect(options.onSave).toHaveBeenCalledTimes(1)
    await act(async () => resolve())
    expect(screen.getByText("You have unpublished changes")).toBeTruthy()
    await tick()
    expect(options.onSave.mock.calls[1][0][0].data.name).toBe("Next draft")
  })

  it("reports a failed publish without marking the draft live", async () => {
    const options = props()
    options.onPublish.mockRejectedValueOnce(new Error("Try publishing again"))
    render(<PageEditor {...options} />)
    rename("New version")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Publish" })))
    expect(screen.getByRole("alert").textContent).toBe("Try publishing again")
    expect(screen.getByText("You have unpublished changes")).toBeTruthy()
    expect(screen.getByRole("status", { name: "Draft save status" }).textContent).toBe("Saved")
  })

  it("offers add, move, and delete buttons", async () => {
    const options = props()
    render(<PageEditor {...options} />)
    expect((screen.getByRole("button", { name: "Move hero block up" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Move about block up" }))
    await tick()
    expect(options.onSave.mock.calls[0][0].map((block: Block) => block.id)).toEqual(["about", "hero"])
    fireEvent.click(screen.getByRole("button", { name: "Delete hero block" }))
    fireEvent.click(screen.getByRole("button", { name: "Add Divider block" }))
    await tick()
    expect(options.onSave.mock.calls[1][0].map((block: Block) => block.type)).toEqual(["about", "divider"])
  })

  it("adds exactly one block per native Enter or Space activation", async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const options = props()
    render(<PageEditor {...options} />)
    screen.getByRole("button", { name: "Add Divider block" }).focus()
    await user.keyboard("{Enter}")
    expect(screen.getAllByRole("button", { name: "Reorder divider block" })).toHaveLength(1)
    await user.keyboard(" ")
    expect(screen.getAllByRole("button", { name: "Reorder divider block" })).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: /^Reorder .+ block$/ })).toHaveLength(4)
  })

  it("cancels same-document history traversal while unsaved when supported", () => {
    const navigation = new EventTarget()
    vi.stubGlobal("navigation", navigation)
    vi.spyOn(window, "confirm").mockReturnValue(false)
    render(<PageEditor {...props()} />)
    rename("Unsaved edit")
    const event = Object.assign(new Event("navigate", { cancelable: true }), {
      navigationType: "traverse", destination: { sameDocument: true },
    })
    navigation.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it("asks before following a same-tab link while unsaved", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    render(<><a href="/dashboard">Dashboard</a><PageEditor {...props()} /></>)
    rename("Unsaved edit")
    expect(fireEvent.click(screen.getByRole("link", { name: "Dashboard" }))).toBe(false)
    expect(confirm).toHaveBeenCalledWith("You have unsaved changes. Leave this page?")
  })
})
