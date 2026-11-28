import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { del, put } from "@vercel/blob"
import { prisma } from "./prisma"
import {
  deleteAllUploads,
  deleteUserUpload,
  detectImageType,
  MAX_UPLOAD_BYTES,
  MAX_USER_UPLOAD_BYTES,
  MAX_USER_UPLOAD_COUNT,
  uploadsConfigured,
  uploadUserImage,
} from "./uploads"

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock("./prisma", () => ({
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
const aggregateMock = vi.mocked(prisma.upload.aggregate)
const createMock = vi.mocked(prisma.upload.create)
const findUniqueMock = vi.mocked(prisma.upload.findUnique)
const findManyMock = vi.mocked(prisma.upload.findMany)
const deleteMock = vi.mocked(prisma.upload.delete)
const deleteManyMock = vi.mocked(prisma.upload.deleteMany)

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
])
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const GIF_BYTES = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00])
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
])
const SVG_BYTES = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',
)

beforeEach(() => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test_token")
  putMock.mockReset()
  delMock.mockReset()
  aggregateMock.mockReset()
  createMock.mockReset()
  findUniqueMock.mockReset()
  findManyMock.mockReset()
  deleteMock.mockReset()
  deleteManyMock.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("uploadsConfigured", () => {
  it("is false without BLOB_READ_WRITE_TOKEN and true when set", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "")
    expect(uploadsConfigured()).toBe(false)
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "   ")
    expect(uploadsConfigured()).toBe(false)
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_123")
    expect(uploadsConfigured()).toBe(true)
  })
})

describe("detectImageType", () => {
  it("recognizes JPEG, PNG, GIF, and WebP by magic bytes", () => {
    expect(detectImageType(JPEG_BYTES)).toEqual({
      contentType: "image/jpeg",
      ext: "jpg",
    })
    expect(detectImageType(PNG_BYTES)).toEqual({
      contentType: "image/png",
      ext: "png",
    })
    expect(detectImageType(GIF_BYTES)).toEqual({
      contentType: "image/gif",
      ext: "gif",
    })
    expect(detectImageType(WEBP_BYTES)).toEqual({
      contentType: "image/webp",
      ext: "webp",
    })
  })

  it("rejects SVG, plain text, and RIFF non-WebP buffers", () => {
    expect(detectImageType(SVG_BYTES)).toBeNull()
    expect(detectImageType(new TextEncoder().encode("not an image"))).toBeNull()
    expect(
      detectImageType(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
        ]),
      ),
    ).toBeNull()
  })
})

describe("uploadUserImage", () => {
  it("stores a valid image on Vercel Blob under u/<userId>/<random>.<ext> and creates an Upload row", async () => {
    aggregateMock.mockResolvedValue({
      _count: { _all: 2 },
      _sum: { size: 1024 },
      _avg: null,
      _min: null,
      _max: null,
    } as never)

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
        id: "upload-1",
        userId: data.userId,
        url: data.url,
        pathname: data.pathname,
        size: data.size,
        contentType: data.contentType,
        createdAt: new Date("2026-11-28T00:00:00Z"),
      }) as never))

    const file = new File([PNG_BYTES], "avatar.png", { type: "image/png" })
    const result = await uploadUserImage({ userId: "user-123", file })

    expect(putMock).toHaveBeenCalledTimes(1)
    const [pathname, , options] = putMock.mock.calls[0]
    expect(pathname).toMatch(/^u\/user-123\/[0-9a-f-]{36}\.png$/)
    expect(options).toEqual({
      access: "public",
      addRandomSuffix: false,
      contentType: "image/png",
    })
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        url: `https://store.public.blob.vercel-storage.com/${pathname}`,
        pathname,
        size: PNG_BYTES.byteLength,
        contentType: "image/png",
      },
    })
    expect(result.url).toBe(
      `https://store.public.blob.vercel-storage.com/${pathname}`,
    )
  })

  it("rejects wrong file type disguised by extension and contentType", async () => {
    const disguisedSvg = new File([SVG_BYTES], "innocent.png", {
      type: "image/png",
    })

    await expect(
      uploadUserImage({ userId: "user-123", file: disguisedSvg }),
    ).rejects.toMatchObject({
      code: "WRONG_TYPE",
      status: 415,
    })

    expect(putMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it("rejects files larger than 4 MB", async () => {
    const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1)
    oversized.set(PNG_BYTES, 0)

    await expect(
      uploadUserImage({ userId: "user-123", file: oversized }),
    ).rejects.toMatchObject({
      code: "TOO_LARGE",
      status: 413,
    })

    expect(putMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it("rejects uploads when user has reached the 50-file or 100-MB quota", async () => {
    aggregateMock.mockResolvedValueOnce({
      _count: { _all: MAX_USER_UPLOAD_COUNT },
      _sum: { size: 1024 },
      _avg: null,
      _min: null,
      _max: null,
    } as never)

    await expect(
      uploadUserImage({ userId: "user-123", file: PNG_BYTES }),
    ).rejects.toMatchObject({
      code: "QUOTA_REACHED",
      status: 403,
    })

    aggregateMock.mockResolvedValueOnce({
      _count: { _all: 10 },
      _sum: { size: MAX_USER_UPLOAD_BYTES - 4 },
      _avg: null,
      _min: null,
      _max: null,
    } as never)

    await expect(
      uploadUserImage({ userId: "user-123", file: PNG_BYTES }),
    ).rejects.toMatchObject({
      code: "QUOTA_REACHED",
      status: 403,
    })

    expect(putMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })
})

describe("deleteUserUpload and deleteAllUploads", () => {
  it("prevents a user from deleting another user's file", async () => {
    findUniqueMock.mockResolvedValue({
      id: "upload-other",
      userId: "owner-user",
      url: "https://store.public.blob.vercel-storage.com/u/owner-user/a.png",
      pathname: "u/owner-user/a.png",
      size: 120,
      contentType: "image/png",
      createdAt: new Date(),
    })

    await expect(
      deleteUserUpload({
        userId: "attacker-user",
        url: "https://store.public.blob.vercel-storage.com/u/owner-user/a.png",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    })

    expect(delMock).not.toHaveBeenCalled()
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it("deletes all uploads for a user from Vercel Blob and Prisma", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "u1",
        url: "https://store.public.blob.vercel-storage.com/u/user-1/one.png",
      },
      {
        id: "u2",
        url: "https://store.public.blob.vercel-storage.com/u/user-1/two.jpg",
      },
    ] as never)
    delMock.mockResolvedValue(undefined)
    deleteManyMock.mockResolvedValue({ count: 2 })

    await expect(deleteAllUploads("user-1")).resolves.toEqual({ deleted: 2 })
    expect(delMock).toHaveBeenCalledWith([
      "https://store.public.blob.vercel-storage.com/u/user-1/one.png",
      "https://store.public.blob.vercel-storage.com/u/user-1/two.jpg",
    ])
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { userId: "user-1" } })
  })
})
