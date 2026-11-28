import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { del, put } from "@vercel/blob"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { MAX_UPLOAD_BYTES, MAX_USER_UPLOAD_COUNT } from "@/lib/uploads"
import { DELETE, GET, POST } from "./route"

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    upload: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

const putMock = vi.mocked(put)
const delMock = vi.mocked(del)
const getServerSessionMock = vi.mocked(getServerSession)
const rateLimitMock = vi.mocked(rateLimit)
const aggregateMock = vi.mocked(prisma.upload.aggregate)
const createMock = vi.mocked(prisma.upload.create)
const findUniqueMock = vi.mocked(prisma.upload.findUnique)
const findManyMock = vi.mocked(prisma.upload.findMany)
const deleteMock = vi.mocked(prisma.upload.delete)

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
])
const SVG_BYTES = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
)

function buildUploadRequest(file: File): Request {
  const formData = new FormData()
  formData.append("file", file)
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  })
}

beforeEach(() => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test_token")
  putMock.mockReset()
  delMock.mockReset()
  getServerSessionMock.mockReset()
  rateLimitMock.mockReset()
  aggregateMock.mockReset()
  createMock.mockReset()
  findUniqueMock.mockReset()
  findManyMock.mockReset()
  deleteMock.mockReset()

  getServerSessionMock.mockResolvedValue({
    user: {
      id: "user-1",
      email: "user1@example.com",
      username: "user1",
    },
    expires: "2026-12-31T00:00:00.000Z",
  })

  rateLimitMock.mockResolvedValue({ ok: true, remaining: 19 })

  aggregateMock.mockResolvedValue({
    _count: { _all: 0 },
    _sum: { size: 0 },
    _avg: null,
    _min: null,
    _max: null,
  } as never)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("/api/upload route", () => {
  it("uploads a valid image, stores an Upload row, and returns its URL (happy path)", async () => {
    putMock.mockImplementation(async (pathname) => ({
      url: `https://store.public.blob.vercel-storage.com/${pathname}`,
      downloadUrl: `https://store.public.blob.vercel-storage.com/${pathname}?download=1`,
      pathname,
      contentType: "image/png",
      contentDisposition: "inline",
      etag: "etag-1",
    }))

    createMock.mockImplementation((({ data }) =>
      Promise.resolve({
        id: "upload-101",
        userId: data.userId,
        url: data.url,
        pathname: data.pathname,
        size: data.size,
        contentType: data.contentType,
        createdAt: new Date("2026-11-28T00:00:00Z"),
      }) as never))

    const file = new File([PNG_BYTES], "profile.png", { type: "image/png" })
    const response = await POST(buildUploadRequest(file))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.url).toMatch(
      /^https:\/\/store\.public\.blob\.vercel-storage\.com\/u\/user-1\/[0-9a-f-]{36}\.png$/,
    )
    expect(body.contentType).toBe("image/png")
    expect(body.size).toBe(PNG_BYTES.byteLength)
    expect(putMock).toHaveBeenCalledTimes(1)
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it("rejects wrong type disguised by extension and stores nothing", async () => {
    const disguised = new File([SVG_BYTES], "avatar.png", { type: "image/png" })
    const response = await POST(buildUploadRequest(disguised))
    const body = await response.json()

    expect(response.status).toBe(415)
    expect(body.code).toBe("WRONG_TYPE")
    expect(putMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it("rejects SVG uploads and stores nothing", async () => {
    const svgFile = new File([SVG_BYTES], "logo.svg", {
      type: "image/svg+xml",
    })
    const response = await POST(buildUploadRequest(svgFile))
    const body = await response.json()

    expect(response.status).toBe(415)
    expect(body.code).toBe("WRONG_TYPE")
    expect(putMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it("rejects files over 4 MB and stores nothing", async () => {
    const tooLargeBytes = new Uint8Array(MAX_UPLOAD_BYTES + 10)
    tooLargeBytes.set(PNG_BYTES, 0)
    const oversizedFile = new File([tooLargeBytes], "huge.png", {
      type: "image/png",
    })

    const response = await POST(buildUploadRequest(oversizedFile))
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.code).toBe("TOO_LARGE")
    expect(putMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it("rejects uploads when user is over quota and stores nothing", async () => {
    aggregateMock.mockResolvedValue({
      _count: { _all: MAX_USER_UPLOAD_COUNT },
      _sum: { size: 5000 },
      _avg: null,
      _min: null,
      _max: null,
    } as never)

    const file = new File([PNG_BYTES], "extra.png", { type: "image/png" })
    const response = await POST(buildUploadRequest(file))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.code).toBe("QUOTA_REACHED")
    expect(putMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it("rejects unauthenticated requests and stores nothing", async () => {
    getServerSessionMock.mockResolvedValue(null)

    const file = new File([PNG_BYTES], "photo.png", { type: "image/png" })
    const postResponse = await POST(buildUploadRequest(file))
    expect(postResponse.status).toBe(401)
    expect(putMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()

    const deleteResponse = await DELETE(
      new Request("http://localhost/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://store.public.blob.vercel-storage.com/u/user-1/a.png",
        }),
      }),
    )
    expect(deleteResponse.status).toBe(401)
    expect(delMock).not.toHaveBeenCalled()
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it("rejects deleting another user's file and allows deleting the owner's own file", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "upload-2",
      userId: "user-2",
      url: "https://store.public.blob.vercel-storage.com/u/user-2/photo.png",
      pathname: "u/user-2/photo.png",
      size: 120,
      contentType: "image/png",
      createdAt: new Date(),
    })

    const forbiddenResponse = await DELETE(
      new Request("http://localhost/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://store.public.blob.vercel-storage.com/u/user-2/photo.png",
        }),
      }),
    )

    expect(forbiddenResponse.status).toBe(403)
    expect(delMock).not.toHaveBeenCalled()
    expect(deleteMock).not.toHaveBeenCalled()

    findUniqueMock.mockResolvedValueOnce({
      id: "upload-1",
      userId: "user-1",
      url: "https://store.public.blob.vercel-storage.com/u/user-1/photo.png",
      pathname: "u/user-1/photo.png",
      size: 120,
      contentType: "image/png",
      createdAt: new Date(),
    })
    delMock.mockResolvedValueOnce(undefined)
    deleteMock.mockResolvedValueOnce({} as never)

    const allowedResponse = await DELETE(
      new Request("http://localhost/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://store.public.blob.vercel-storage.com/u/user-1/photo.png",
        }),
      }),
    )

    expect(allowedResponse.status).toBe(200)
    expect(delMock).toHaveBeenCalledWith(
      "https://store.public.blob.vercel-storage.com/u/user-1/photo.png",
    )
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "upload-1" } })
  })

  it("prevents listing another user's files", async () => {
    const forbiddenList = await GET(
      new Request("http://localhost/api/upload?userId=user-2"),
    )
    expect(forbiddenList.status).toBe(403)
    expect(findManyMock).not.toHaveBeenCalled()

    findManyMock.mockResolvedValueOnce([])
    const ownList = await GET(new Request("http://localhost/api/upload"))
    expect(ownList.status).toBe(200)
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    })
  })
})
