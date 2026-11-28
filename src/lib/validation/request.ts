import { NextResponse } from "next/server"
import { z } from "zod"
import { MAX_SITE_CONTENT_BYTES, validationMessage } from "./site-content"

export class InvalidRequest extends Error {}

// Bound the stream itself instead of trusting the caller's Content-Length header.
export async function readJson(req: Request): Promise<unknown> {
  if (Number(req.headers.get("content-length")) > MAX_SITE_CONTENT_BYTES) {
    throw new InvalidRequest("Request must be 200 KB or smaller")
  }
  const reader = req.body?.getReader()
  if (!reader) throw new InvalidRequest("Request must contain valid JSON")
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let size = 0
  let text = ""
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_SITE_CONTENT_BYTES) {
        await reader.cancel()
        throw new InvalidRequest("Request must be 200 KB or smaller")
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
    return JSON.parse(text)
  } catch (error) {
    if (error instanceof InvalidRequest) throw error
    throw new InvalidRequest("Request must contain valid JSON")
  } finally {
    reader.releaseLock()
  }
}

export function requestError(error: unknown, fallback: string) {
  if (error instanceof InvalidRequest || error instanceof z.ZodError) {
    return NextResponse.json({ error: error instanceof z.ZodError ? validationMessage(error) : error.message }, { status: 400 })
  }
  // Log fixed operation context and a safe type, never arbitrary error details.
  console.error("Site request failed", {
    operation: fallback,
    errorType: error instanceof Error ? "Error" : typeof error,
  })
  return NextResponse.json({ error: fallback }, { status: 500 })
}
