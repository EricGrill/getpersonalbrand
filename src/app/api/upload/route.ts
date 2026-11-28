import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit"
import {
  deleteUserUpload,
  listUserUploads,
  UploadError,
  uploadsConfigured,
  uploadUserImage,
} from "@/lib/uploads"

const UPLOAD_RATE_LIMIT = 20
const UPLOAD_RATE_WINDOW_SECONDS = 60

async function extractUploadFile(
  req: Request,
): Promise<Blob | ArrayBuffer | null> {
  const contentType = (req.headers.get("content-type") ?? "").toLowerCase()

  if (contentType.includes("multipart/form-data") || contentType === "") {
    try {
      const formData = await req.formData()
      const fileEntry = formData.get("file")
      if (fileEntry && typeof fileEntry !== "string") {
        return fileEntry
      }
      for (const value of formData.values()) {
        if (typeof value !== "string") {
          return value
        }
      }
      return null
    } catch {
      return null
    }
  }

  try {
    const buffer = await req.arrayBuffer()
    return buffer.byteLength > 0 ? buffer : null
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestedUserId = new URL(req.url).searchParams.get("userId")
    if (requestedUserId && requestedUserId !== session.user.id) {
      return NextResponse.json(
        { error: "You cannot list another user's files.", code: "FORBIDDEN" },
        { status: 403 },
      )
    }

    const uploads = await listUserUploads(session.user.id)
    return NextResponse.json({
      configured: uploadsConfigured(),
      uploads,
    })
  } catch (error) {
    console.error("List uploads error:", error)
    return NextResponse.json(
      { error: "Failed to list uploads" },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!uploadsConfigured()) {
      return NextResponse.json(
        { error: "Image uploads are not configured.", code: "NOT_CONFIGURED" },
        { status: 503 },
      )
    }

    const limitResult = await rateLimit({
      key: `upload:${session.user.id}`,
      limit: UPLOAD_RATE_LIMIT,
      windowSeconds: UPLOAD_RATE_WINDOW_SECONDS,
    })

    if (!limitResult.ok) {
      return NextResponse.json(
        {
          error: "Too many upload requests. Please try again shortly.",
          code: "RATE_LIMITED",
        },
        { status: 429 },
      )
    }

    const file = await extractUploadFile(req)
    if (!file) {
      return NextResponse.json(
        { error: "No image file provided.", code: "MISSING_FILE" },
        { status: 400 },
      )
    }

    const upload = await uploadUserImage({
      userId: session.user.id,
      file,
    })

    return NextResponse.json({
      id: upload.id,
      url: upload.url,
      pathname: upload.pathname,
      size: upload.size,
      contentType: upload.contentType,
    })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      )
    }
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestUrl = new URL(req.url)
    let url = requestUrl.searchParams.get("url")?.trim() || undefined
    let id = requestUrl.searchParams.get("id")?.trim() || undefined

    if (!url && !id) {
      const body = await req.json().catch(() => null)
      if (body && typeof body === "object") {
        if (typeof body.url === "string" && body.url.trim()) {
          url = body.url.trim()
        }
        if (typeof body.id === "string" && body.id.trim()) {
          id = body.id.trim()
        }
      }
    }

    const result = await deleteUserUpload({
      userId: session.user.id,
      url,
      id,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      )
    }
    console.error("Delete upload error:", error)
    return NextResponse.json(
      { error: "Failed to delete upload" },
      { status: 500 },
    )
  }
}
