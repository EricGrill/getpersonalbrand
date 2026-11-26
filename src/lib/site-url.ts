// Keep this module client-safe: Next inlines only these public configuration values.
function appOrigin(): URL {
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || "getpersonalbrand.com"
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(domain)
  return new URL(`${local ? "http" : "https"}://${domain}`)
}

export function appUrl(path = ""): string {
  const url = appOrigin()
  if (path) {
    if (/[\u0000-\u001f\u007f]/.test(path)) {
      throw new Error("App URL paths must not contain control characters")
    }
    const relative = path.replace(/^[/\\]+/, "")
    return new URL(`/${relative}`, url).toString()
  }
  return url.origin
}

export function siteHost(username: string): string {
  const url = appOrigin()
  if (process.env.NEXT_PUBLIC_SITE_URL_MODE === "subdomain") {
    url.hostname = `${username}.${url.hostname}`
  }
  return url.host
}

export function siteUrl(username: string): string {
  if (process.env.NEXT_PUBLIC_SITE_URL_MODE !== "subdomain") {
    return appUrl(`/site/${encodeURIComponent(username)}`)
  }
  const url = appOrigin()
  url.host = siteHost(username)
  return url.origin
}
