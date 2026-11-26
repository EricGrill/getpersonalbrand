export const RESERVED_USERNAMES = new Set([
  "www", "app", "api", "admin", "cname", "mail", "site", "s", "d", "report",
  "login", "register", "dashboard", "editor", "settings", "analytics", "onboarding",
  "support", "help", "status", "blog", "auth", "account", "accounts", "contact",
  "terms", "privacy", "legal", "abuse", "security", "billing", "pricing", "assets",
  "static", "cdn", "images", "uploads", "docs", "about", "logout", "signin",
  "signup", "signout", "reset-password", "forgot-password", "verify-email",
  "email", "ftp", "smtp", "imap", "pop", "ns1", "ns2", "autodiscover", "webmail",
])

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase()
}

export function validateUsername(input: string): { ok: boolean; error?: string } {
  const username = normalizeUsername(input)
  if (username.length < 3 || username.length > 30) {
    return { ok: false, error: "Username must be between 3 and 30 characters." }
  }
  if (!/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/.test(username)) {
    return { ok: false, error: "Use letters, numbers and hyphens, with no leading or trailing hyphen." }
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, error: "This username is reserved." }
  }
  return { ok: true }
}
