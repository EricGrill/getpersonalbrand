// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ImageField } from "./ImageField"

afterEach(cleanup)

describe("ImageField", () => {
  it("labels the input and previews an HTTPS image", () => {
    render(<ImageField value="https://example.com/photo.png" onChange={vi.fn()} label="Profile photo" />)
    expect(screen.getByLabelText("Profile photo").getAttribute("type")).toBe("url")
    expect(screen.getByRole("img").getAttribute("src")).toBe("https://example.com/photo.png")
  })

  it("reports null when cleared and reports an edited URL", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ImageField value="https://example.com/photo.png" onChange={onChange} />)
    await userEvent.clear(screen.getByLabelText("Image URL"))
    expect(onChange).toHaveBeenLastCalledWith(null)
    rerender(<ImageField value={null} onChange={onChange} />)
    await userEvent.paste("https://example.com/new.png")
    expect(onChange).toHaveBeenLastCalledWith("https://example.com/new.png")
  })

  it.each([null, "javascript:alert(1)", "mailto:hello@example.com"])("does not preview %s", (value) => {
    render(<ImageField value={value} onChange={vi.fn()} />)
    expect(screen.queryByRole("img")).toBeNull()
  })
})
