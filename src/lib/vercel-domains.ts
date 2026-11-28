import { z } from "zod"

const projectDomainSchema = z.object({
  name: z.string().min(1),
  apexName: z.string().min(1),
  projectId: z.string().min(1),
  verified: z.boolean(),
  verification: z.array(z.object({
    type: z.string(),
    domain: z.string(),
    value: z.string(),
    reason: z.string().optional(),
  })).optional(),
})

const domainConfigSchema = z.object({
  misconfigured: z.boolean(),
  recommendedIPv4: z.array(z.object({ rank: z.number(), value: z.array(z.string()) })),
  recommendedCNAME: z.array(z.object({ rank: z.number(), value: z.string() })),
})

export type ProjectDomain = z.infer<typeof projectDomainSchema>
export type DomainConfig = z.infer<typeof domainConfigSchema>
export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string }

export function domainsConfigured(): boolean {
  return [process.env.VERCEL_TOKEN, process.env.VERCEL_PROJECT_ID, process.env.VERCEL_TEAM_ID]
    .every((value) => Boolean(value?.trim()))
}

export class VercelDomainError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    // Provider messages can contain account details. Return only our own messages.
    super(status === 403 || status === 409
      ? "Vercel could not assign this domain. Check domain ownership and existing project assignments."
      : status === 429
        ? "Vercel is busy. Please try again later."
        : "Vercel could not complete the domain request. Please check again.")
  }
}

async function request(path: string, method = "GET", body?: object, projectConfig = false) {
  if (!domainsConfigured()) throw new VercelDomainError(503, "not_configured")
  const url = new URL(path, "https://api.vercel.com")
  url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID!.trim())
  if (projectConfig) url.searchParams.set("projectIdOrName", process.env.VERCEL_PROJECT_ID!.trim())

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN!.trim()}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    throw new VercelDomainError(502, "unavailable")
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const code = typeof payload?.error?.code === "string" ? payload.error.code : "request_failed"
    throw new VercelDomainError(response.status, code)
  }
  if (method === "DELETE") return null
  return response.json().catch(() => { throw new VercelDomainError(502, "invalid_response") })
}

function projectPath(version: number, domain?: string) {
  const project = encodeURIComponent(process.env.VERCEL_PROJECT_ID?.trim() ?? "")
  return `/v${version}/projects/${project}/domains${domain ? `/${encodeURIComponent(domain)}` : ""}`
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new VercelDomainError(502, "invalid_response")
  return result.data
}

export async function addProjectDomain(domain: string): Promise<ProjectDomain> {
  return parse(projectDomainSchema, await request(projectPath(10), "POST", { name: domain }))
}

export async function getProjectDomain(domain: string): Promise<ProjectDomain> {
  return parse(projectDomainSchema, await request(projectPath(9, domain)))
}

export async function getDomainConfig(domain: string): Promise<DomainConfig> {
  return parse(domainConfigSchema, await request(`/v6/domains/${encodeURIComponent(domain)}/config`, "GET", undefined, true))
}

export async function verifyProjectDomain(domain: string): Promise<ProjectDomain> {
  return parse(projectDomainSchema, await request(`${projectPath(9, domain)}/verify`, "POST"))
}

export async function removeProjectDomain(domain: string): Promise<void> {
  try {
    await request(projectPath(9, domain), "DELETE")
  } catch (error) {
    if (!(error instanceof VercelDomainError && error.status === 404 && error.code === "not_found")) throw error
    // A missing project also returns 404. Confirm the configured scope exists first.
    const project = parse(z.object({ id: z.string(), accountId: z.string() }),
      await request(`/v9/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID!.trim())}`))
    if (project.id !== process.env.VERCEL_PROJECT_ID!.trim() || project.accountId !== process.env.VERCEL_TEAM_ID!.trim()) {
      throw new VercelDomainError(502, "project_mismatch")
    }
    try {
      await getProjectDomain(domain)
    } catch (readError) {
      if (readError instanceof VercelDomainError && readError.status === 404 && readError.code === "not_found") return
      throw readError
    }
    throw new VercelDomainError(502, "removal_unconfirmed")
  }
}

export function dnsRecords(project: ProjectDomain, config: DomainConfig): DnsRecord[] {
  const records: DnsRecord[] = []
  if (project.name === project.apexName) {
    const preferred = [...config.recommendedIPv4].sort((a, b) => a.rank - b.rank)[0]
    if (preferred?.value[0]) records.push({ type: "A", name: project.name, value: preferred.value[0] })
  } else {
    const preferred = [...config.recommendedCNAME].sort((a, b) => a.rank - b.rank)[0]
    if (preferred?.value) records.push({ type: "CNAME", name: project.name, value: preferred.value })
  }
  for (const challenge of project.verification ?? []) {
    if (challenge.type === "TXT") {
      records.push({ type: "TXT", name: challenge.domain, value: challenge.value })
    }
  }
  return records
}
