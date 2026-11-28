import { isIP } from "node:net"
import { domainToASCII } from "node:url"
import { Prisma, type Domain } from "@prisma/client"
import { prisma } from "./prisma"
import {
  addProjectDomain, dnsRecords, domainsConfigured, getDomainConfig,
  getProjectDomain, removeProjectDomain, VercelDomainError, verifyProjectDomain,
  type DomainConfig, type ProjectDomain,
} from "./vercel-domains"

export class DomainError extends Error {
  constructor(message: string, public readonly status = 400, public readonly domain?: Domain) {
    super(message)
  }
}

export function normalizeDomain(value: unknown): string {
  if (typeof value !== "string") throw new DomainError("Enter a valid domain name")
  const input = value.trim().toLowerCase()
  if (!input || /[\s/:@?#\\%]/u.test(input)) throw new DomainError("Enter a domain without a scheme, port or path")
  const domain = domainToASCII(input).replace(/\.$/, "")
  const labels = domain.split(".")
  if (!domain || domain.length > 253 || isIP(domain) || labels.length < 2 ||
      !/[a-z]/.test(labels.at(-1)!) ||
      labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new DomainError("Enter a valid domain name")
  }
  const appDomain = domainToASCII((process.env.NEXT_PUBLIC_APP_DOMAIN || "getpersonalbrand.com").trim().toLowerCase()).replace(/\.$/, "")
  if ([appDomain, "getpersonalbrand.com"].some((app) => domain === app || domain.endsWith(`.${app}`))) {
    throw new DomainError("The app domain and its subdomains cannot be added")
  }
  return domain
}

function requireConfigured() {
  if (!domainsConfigured()) throw new DomainError("Custom domains are not available yet", 503)
}

// Reserve first so remote failures leave a durable record that can be retried or removed.
async function reserveDomain(siteId: string, userId: string, domain: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const sites = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Site" WHERE "id" = ${siteId} AND "userId" = ${userId} FOR UPDATE
      `
      if (!sites.length) throw new DomainError("Site not found", 404)
      if (await tx.domain.findUnique({ where: { domain } })) throw new DomainError("Domain already in use", 409)
      if (await tx.domain.count({ where: { siteId } }) >= 2) throw new DomainError("You can connect at most 2 domains per site", 409)
      return tx.domain.create({ data: {
        siteId, domain, status: "pending_verification",
        verification: { projectId: process.env.VERCEL_PROJECT_ID!.trim(), teamId: process.env.VERCEL_TEAM_ID!.trim() },
      } })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DomainError("Domain already in use", 409)
    }
    throw error
  }
}

// Serialize remote changes to a domain so remove cannot race an in-flight add or verify.
async function withDomain<T>(domainId: string, userId: string | undefined,
  action: (tx: Prisma.TransactionClient, domain: Domain) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Domain" WHERE "id" = ${domainId} FOR UPDATE`
    const domain = await tx.domain.findUnique({ where: { id: domainId }, include: { site: { select: { userId: true } } } })
    if (!domain || (userId !== undefined && domain.site.userId !== userId)) throw new DomainError("Domain not found", 404)
    const saved = domain.verification
    if (saved && typeof saved === "object" && !Array.isArray(saved) &&
        ((typeof saved.projectId === "string" && saved.projectId !== process.env.VERCEL_PROJECT_ID?.trim()) ||
         (typeof saved.teamId === "string" && saved.teamId !== process.env.VERCEL_TEAM_ID?.trim()))) {
      throw new DomainError("The domain's Vercel configuration has changed. Restore its original project and team before managing it.", 503)
    }
    return action(tx, domain)
  }, { timeout: 40000 })
}

function verificationData(project: ProjectDomain, config: DomainConfig | null): Prisma.InputJsonValue {
  // Remove optional undefined properties before persisting provider data as JSON.
  return JSON.parse(JSON.stringify({
    projectId: process.env.VERCEL_PROJECT_ID!.trim(), teamId: process.env.VERCEL_TEAM_ID!.trim(),
    project, config,
    records: config ? dnsRecords(project, config) : (project.verification ?? [])
      .filter((challenge) => challenge.type === "TXT")
      .map((challenge) => ({ type: "TXT", name: challenge.domain, value: challenge.value })),
  }))
}

async function syncDomain(domainId: string, userId: string, adding: boolean) {
  requireConfigured()
  const result = await withDomain(domainId, userId, async (tx, domain) => {
    let project: ProjectDomain | undefined
    let config: DomainConfig | null = null
    let verificationError: string | null = null
    try {
      if (adding) {
        project = await addProjectDomain(domain.domain)
      } else {
        try {
          project = await getProjectDomain(domain.domain)
        } catch (error) {
          // Recover a failed add or a legacy row that was never registered with Vercel.
          if (!(error instanceof VercelDomainError && error.status === 404)) throw error
          project = await addProjectDomain(domain.domain)
        }
        if (!project.verified) {
          try {
            const checked = await verifyProjectDomain(domain.domain)
            project = {
              ...checked,
              verification: checked.verified ? [] : checked.verification ?? project.verification,
            }
          } catch (error) {
            // Missing or mismatched ownership TXT records are an expected pending state.
            if (!(error instanceof VercelDomainError && error.status === 400)) throw error
            verificationError = "Ownership verification is pending. Check the TXT record and try again."
          }
        }
      }
      config = await getDomainConfig(domain.domain)
      const verified = project.verified === true && config.misconfigured === false
      const status = verified ? "verified" : project.verified ? "misconfigured" : "pending_verification"
      const lastError = verified ? null : verificationError ?? (project.verified
        ? "DNS is not configured correctly. Update the records below and check again."
        : "Ownership verification is pending. Add the requested TXT record and check again.")
      const updated = await tx.domain.update({ where: { id: domain.id }, data: {
        status, lastError, verifiedAt: verified ? new Date() : null,
        lastCheckedAt: new Date(), verification: verificationData(project, config),
      } })
      return { domain: updated, error: null }
    } catch (error) {
      if (!(error instanceof VercelDomainError)) throw error
      const updated = await tx.domain.update({ where: { id: domain.id }, data: {
        status: "failed", verifiedAt: null, lastCheckedAt: new Date(), lastError: error.message,
        ...(project ? { verification: verificationData(project, config) } : {}),
      } })
      return { domain: updated, error: error.message }
    }
  })
  // Throw outside the transaction so failed-operation details are committed.
  if (result.error) throw new DomainError(result.error, 502, result.domain)
  return result.domain
}

export async function addDomain(siteId: string, userId: string, value: unknown) {
  requireConfigured()
  const domain = normalizeDomain(value)
  const row = await reserveDomain(siteId, userId, domain)
  return syncDomain(row.id, userId, true)
}

export async function verifyDomain(domainId: string, userId: string) {
  return syncDomain(domainId, userId, false)
}

// Server-only account deletion callers may omit userId after authorizing the account.
export async function releaseDomain(domainId: string, userId?: string): Promise<void> {
  requireConfigured()
  const error = await withDomain(domainId, userId, async (tx, domain) => {
    try {
      await removeProjectDomain(domain.domain)
    } catch (error) {
      if (!(error instanceof VercelDomainError)) throw error
      await tx.domain.update({ where: { id: domain.id }, data: { lastError: error.message } })
      return new DomainError(error.message, 502)
    }
    await tx.domain.delete({ where: { id: domain.id } })
    return null
  })
  if (error) throw error
}
