"use client"

import { useId, useRef, useState } from "react"
import { safeHref } from "@/lib/safe-url"

const MAX_FILE_BYTES = 4 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

type ImageFieldProps = {
  value: string | null
  onChange(url: string | null): void
  label?: string
}

function mapUploadError(status: number, code?: string, message?: string): string {
  if (code === "TOO_LARGE" || status === 413) {
    return "Image is too large. Maximum file size is 4 MB."
  }
  if (code === "WRONG_TYPE" || status === 415) {
    return "Unsupported file type. Upload a JPEG, PNG, WebP, or GIF image."
  }
  if (code === "QUOTA_REACHED" || status === 403) {
    return "Upload quota reached (maximum 50 files and 100 MB per account)."
  }
  return message || "Upload failed. Please try again."
}

export function ImageField({
  value,
  onChange,
  label = "Image URL",
}: ImageFieldProps) {
  const id = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fallbackToUrl, setFallbackToUrl] = useState(false)

  const href = safeHref(value ?? "")
  const preview = href && /^https?:/.test(href) ? href : null

  const uploadsEnabled =
    !fallbackToUrl &&
    Boolean(
      process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
        process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN?.trim(),
    )

  if (!uploadsEnabled) {
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          id={id}
          type="url"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
          placeholder="https://example.com/image.jpg"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={`${label} preview`}
            className="max-h-48 rounded-lg object-contain"
          />
        )}
      </div>
    )
  }

  async function handleFile(file: File) {
    setError(null)

    if (file.size === 0) {
      setError("File cannot be empty.")
      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setError("Image is too large. Maximum file size is 4 MB.")
      return
    }

    const lowerName = file.name.toLowerCase()
    if (
      lowerName.endsWith(".svg") ||
      file.type === "image/svg+xml" ||
      (file.type && !ALLOWED_MIME_TYPES.has(file.type))
    ) {
      setError("Unsupported file type. Upload a JPEG, PNG, WebP, or GIF image.")
      return
    }

    setIsUploading(true)
    setProgress(40)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json().catch(() => ({}))) as {
        url?: string
        error?: string
        code?: string
      }

      if (response.status === 503 || data.code === "NOT_CONFIGURED") {
        setFallbackToUrl(true)
        return
      }

      if (!response.ok || typeof data.url !== "string") {
        setError(mapUploadError(response.status, data.code, data.error))
        return
      }

      setProgress(100)
      onChange(data.url)
    } catch {
      setError("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
      setProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  function handleRemove() {
    const previousUrl = value
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onChange(null)

    if (previousUrl && typeof fetch === "function") {
      void fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: previousUrl }),
      }).catch(() => undefined)
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div
        data-testid="image-dropzone"
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          const droppedFile = event.dataTransfer.files?.[0]
          if (droppedFile) {
            void handleFile(droppedFile)
          }
        }}
        className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        }`}
      >
        <input
          id={id}
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={isUploading}
          onChange={(event) => {
            const selectedFile = event.target.files?.[0]
            if (selectedFile) {
              void handleFile(selectedFile)
            }
          }}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Choose file
          </button>
          <p className="text-xs text-gray-500">
            or drag and drop a JPEG, PNG, WebP, or GIF image (max 4 MB)
          </p>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
          >
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {preview && (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={`${label} preview`}
            className="max-h-48 rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Remove
          </button>
        </div>
      )}

      {!preview && value && (
        <button
          type="button"
          onClick={handleRemove}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Remove
        </button>
      )}
    </div>
  )
}
