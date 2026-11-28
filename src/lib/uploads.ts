import { randomUUID } from "node:crypto"
import { del, put } from "@vercel/blob"
import { prisma } from "./prisma"

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // 4 MB
export const MAX_USER_UPLOAD_COUNT = 50
export const MAX_USER_UPLOAD_BYTES = 100 * 1024 * 1024 // 100 MB

export type DetectedImageType = {
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
  ext: "jpg" | "png" | "webp" | "gif"
}

export type UploadErrorCode =
  | "NOT_CONFIGURED"
  | "EMPTY_FILE"
  | "TOO_LARGE"
  | "WRONG_TYPE"
  | "QUOTA_REACHED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"

export class UploadError extends Error {
  readonly code: UploadErrorCode
  readonly status: number

  constructor(code: UploadErrorCode, message: string, status: number) {
    super(message)
    this.name = "UploadError"
    this.code = code
    this.status = status
  }
}

export function uploadsConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
}

/**
 * Inspect magic bytes to verify the buffer is a genuine JPEG, PNG, GIF, or WebP image.
 * Never trusts file extension or client-supplied Content-Type; rejects SVG and all other formats.
 */
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { contentType: "image/jpeg", ext: "jpg" }
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", ext: "png" }
  }

  // GIF: "GIF87a" or "GIF89a"
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { contentType: "image/gif", ext: "gif" }
  }

  // WebP: "RIFF" + 4-byte size + "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { contentType: "image/webp", ext: "webp" }
  }

  return null
}

async function toBytes(input: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (input instanceof Uint8Array) {
    if (input.byteLength > MAX_UPLOAD_BYTES) {
      throw new UploadError(
        "TOO_LARGE",
        "Image is too large. Maximum file size is 4 MB.",
        413,
      )
    }
    return input
  }
  if (input instanceof ArrayBuffer) {
    if (input.byteLength > MAX_UPLOAD_BYTES) {
      throw new UploadError(
        "TOO_LARGE",
        "Image is too large. Maximum file size is 4 MB.",
        413,
      )
    }
    return new Uint8Array(input)
  }
  if (typeof input.size === "number" && input.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      "TOO_LARGE",
      "Image is too large. Maximum file size is 4 MB.",
      413,
    )
  }
  const arrayBuffer = await input.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      "TOO_LARGE",
      "Image is too large. Maximum file size is 4 MB.",
      413,
    )
  }
  return new Uint8Array(arrayBuffer)
}

export async function uploadUserImage({
  userId,
  file,
}: {
  userId: string
  file: Blob | ArrayBuffer | Uint8Array
}) {
  if (!userId || /[\/\\]|\.\./.test(userId)) {
    throw new UploadError("UNAUTHORIZED", "Unauthorized", 401)
  }

  if (!uploadsConfigured()) {
    throw new UploadError(
      "NOT_CONFIGURED",
      "Image uploads are not configured.",
      503,
    )
  }

  const bytes = await toBytes(file)

  if (bytes.byteLength === 0) {
    throw new UploadError("EMPTY_FILE", "File cannot be empty.", 400)
  }

  const detected = detectImageType(bytes)
  if (!detected) {
    throw new UploadError(
      "WRONG_TYPE",
      "Unsupported file type. Upload a JPEG, PNG, WebP, or GIF image.",
      415,
    )
  }

  const usage = await prisma.upload.aggregate({
    where: { userId },
    _count: { _all: true },
    _sum: { size: true },
  })

  const currentCount = usage._count._all
  const currentBytes = usage._sum.size ?? 0

  if (
    currentCount >= MAX_USER_UPLOAD_COUNT ||
    currentBytes + bytes.byteLength > MAX_USER_UPLOAD_BYTES
  ) {
    throw new UploadError(
      "QUOTA_REACHED",
      "Upload quota reached (maximum 50 files and 100 MB per account).",
      403,
    )
  }

  const pathname = `u/${userId}/${randomUUID()}.${detected.ext}`
  const blob = await put(pathname, Buffer.from(bytes), {
    access: "public",
    addRandomSuffix: false,
    contentType: detected.contentType,
  })

  try {
    return await prisma.upload.create({
      data: {
        userId,
        url: blob.url,
        pathname: blob.pathname || pathname,
        size: bytes.byteLength,
        contentType: detected.contentType,
      },
    })
  } catch (error) {
    await del(blob.url).catch(() => undefined)
    throw error
  }
}

export async function deleteUserUpload({
  userId,
  url,
  id,
}: {
  userId: string
  url?: string
  id?: string
}) {
  if (!userId) {
    throw new UploadError("UNAUTHORIZED", "Unauthorized", 401)
  }

  if (!url && !id) {
    throw new UploadError("EMPTY_FILE", "Upload URL or ID is required.", 400)
  }

  const upload = await prisma.upload.findUnique({
    where: id ? { id } : { url: url! },
  })

  if (!upload) {
    throw new UploadError("NOT_FOUND", "Upload not found.", 404)
  }

  if (upload.userId !== userId) {
    throw new UploadError(
      "FORBIDDEN",
      "You cannot delete another user's file.",
      403,
    )
  }

  await del(upload.url)
  await prisma.upload.delete({
    where: { id: upload.id },
  })

  return { deleted: true, id: upload.id, url: upload.url }
}

export async function deleteAllUploads(
  userId: string,
): Promise<{ deleted: number }> {
  const uploads = await prisma.upload.findMany({
    where: { userId },
    select: { id: true, url: true },
  })

  if (uploads.length === 0) {
    return { deleted: 0 }
  }

  await del(uploads.map((upload) => upload.url))

  await prisma.upload.deleteMany({
    where: { userId },
  })

  return { deleted: uploads.length }
}

export async function listUserUploads(userId: string) {
  return prisma.upload.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
}
