import { z } from "zod"

const optionalString = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(1).optional(),
)

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url().optional(),
  ),
  NEXT_PUBLIC_APP_DOMAIN: z.string().min(1).default("getpersonalbrand.com"),
  NEXT_PUBLIC_SITE_URL_MODE: z.enum(["path", "subdomain"]).default("path"),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  VERCEL_TOKEN: optionalString,
  VERCEL_PROJECT_ID: optionalString,
  VERCEL_TEAM_ID: optionalString,
  BLOB_READ_WRITE_TOKEN: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  ADMIN_EMAILS: z.string().optional().transform((value) =>
    (value ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
  ),
  CRON_SECRET: optionalString,
  ANALYTICS_SALT: optionalString,
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  return envSchema.parse(source)
}

// Validate at the server operation boundary, not while Next imports modules to build.
export function getEnv(): Env {
  return parseEnv(process.env)
}
