"use client"

import { useId } from "react"
import { safeHref } from "@/lib/safe-url"

type ImageFieldProps = {
  value: string | null
  onChange(url: string | null): void
  label?: string
}

export function ImageField({ value, onChange, label = "Image URL" }: ImageFieldProps) {
  const id = useId()
  const href = safeHref(value ?? "")
  const preview = href && /^https?:/.test(href) ? href : null

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
        // Remote image hosts are user supplied; uploads will replace this preview.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={`${label} preview`} className="max-h-48 rounded-lg object-contain" />
      )}
    </div>
  )
}
