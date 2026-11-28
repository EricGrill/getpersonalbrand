// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ImageField } from "./ImageField"

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ImageField fallback when uploads are not configured", () => {
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

describe("ImageField when uploads are configured", () => {
  it("uploads a chosen file, shows progress, updates value, and allows removal", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test")

    let resolveUpload!: (res: Response) => void
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveUpload = resolve
        }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const onChange = vi.fn()
    const { rerender } = render(
      <ImageField value={null} onChange={onChange} label="Profile photo" />,
    )

    const input = screen.getByLabelText("Profile photo") as HTMLInputElement
    expect(input.type).toBe("file")

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "photo.png", {
      type: "image/png",
    })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByRole("progressbar")).toBeTruthy()
    expect(screen.getByText("Uploading...")).toBeTruthy()

    resolveUpload(
      new Response(
        JSON.stringify({
          url: "https://store.public.blob.vercel-storage.com/u/user-1/photo.png",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        "https://store.public.blob.vercel-storage.com/u/user-1/photo.png",
      )
    })

    rerender(
      <ImageField
        value="https://store.public.blob.vercel-storage.com/u/user-1/photo.png"
        onChange={onChange}
        label="Profile photo"
      />,
    )

    expect(screen.getByRole("img").getAttribute("src")).toBe(
      "https://store.public.blob.vercel-storage.com/u/user-1/photo.png",
    )

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ deleted: true }), { status: 200 }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(fetchMock).toHaveBeenLastCalledWith("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://store.public.blob.vercel-storage.com/u/user-1/photo.png",
      }),
    })
  })

  it("uploads a dropped file via drag and drop", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test")
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: "https://store.public.blob.vercel-storage.com/u/user-1/dropped.webp",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const onChange = vi.fn()
    render(<ImageField value={null} onChange={onChange} label="Portfolio image" />)

    const dropzone = screen.getByTestId("image-dropzone")
    const file = new File([new Uint8Array([1, 2, 3])], "dropped.webp", {
      type: "image/webp",
    })

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    })

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        "https://store.public.blob.vercel-storage.com/u/user-1/dropped.webp",
      )
    })
  })

  it("shows clear errors for too large, wrong type, and quota reached", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test")
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    render(<ImageField value={null} onChange={vi.fn()} label="Avatar" />)
    const input = screen.getByLabelText("Avatar")

    // 1. Too large (> 4 MB)
    const hugeFile = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "huge.png", {
      type: "image/png",
    })
    fireEvent.change(input, { target: { files: [hugeFile] } })
    expect((await screen.findByRole("alert")).textContent).toContain("4 MB")
    expect(fetchMock).not.toHaveBeenCalled()

    // 2. Wrong type (SVG)
    const svgFile = new File(["<svg></svg>"], "icon.svg", {
      type: "image/svg+xml",
    })
    fireEvent.change(input, { target: { files: [svgFile] } })
    expect((await screen.findByRole("alert")).textContent).toContain(
      "JPEG, PNG, WebP, or GIF",
    )
    expect(fetchMock).not.toHaveBeenCalled()

    // 3. Quota reached (403 from server)
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "Upload quota reached",
          code: "QUOTA_REACHED",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    )
    const validFile = new File([new Uint8Array([1, 2, 3])], "ok.png", {
      type: "image/png",
    })
    fireEvent.change(input, { target: { files: [validFile] } })
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("50 files and 100 MB")
    })
  })
})
