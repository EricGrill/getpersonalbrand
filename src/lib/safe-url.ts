export function safeHref(input: string | null | undefined): string | null {
  if (!input || /[\u0000-\u001f\u007f]/.test(input)) return null
  try {
    const url = new URL(input.trim())
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return null
    if (url.protocol === "mailto:" && !url.pathname) return null
    return url.href
  } catch {
    return null
  }
}
