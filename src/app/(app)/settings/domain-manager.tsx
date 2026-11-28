"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, RefreshCw, CheckCircle, Clock, XCircle } from "lucide-react"

interface Domain {
  id: string
  domain: string
  status: string
  verifiedAt: Date | string | null
  verification?: unknown
  lastError?: string | null
}

interface DomainManagerProps {
  siteId: string
  domains: Domain[]
}

interface DnsRecord {
  type: "A" | "CNAME" | "TXT"
  name: string
  value: string
}

function dnsRecords(verification: unknown): DnsRecord[] {
  if (!verification || typeof verification !== "object" || !("records" in verification)) return []
  if (!Array.isArray(verification.records)) return []

  return verification.records.filter((record): record is DnsRecord =>
    record && typeof record === "object" &&
    ["A", "CNAME", "TXT"].includes(record.type) &&
    typeof record.name === "string" && typeof record.value === "string",
  )
}

const STATUS_CONFIG = {
  pending_verification: {
    icon: Clock,
    label: "Pending",
    color: "text-yellow-600 bg-yellow-100",
  },
  verified: {
    icon: CheckCircle,
    label: "Verified",
    color: "text-green-600 bg-green-100",
  },
  misconfigured: {
    icon: XCircle,
    label: "Misconfigured",
    color: "text-red-600 bg-red-100",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    color: "text-red-600 bg-red-100",
  },
}

export function DomainManager({ siteId, domains: initialDomains }: DomainManagerProps) {
  const [domains, setDomains] = useState<Domain[]>(initialDomains)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [configurationError, setConfigurationError] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState("")
  const [adding, setAdding] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = adding || verifying !== null || removing !== null

  useEffect(() => {
    let active = true

    async function checkConfiguration() {
      try {
        const response = await fetch("/api/domains/config", { cache: "no-store" })
        const data = await response.json()
        if (!response.ok || typeof data.configured !== "boolean") throw new Error()
        if (active) setConfigured(data.configured)
      } catch {
        if (active) setConfigurationError("Could not check custom domain availability. Reload this page to try again.")
      }
    }

    void checkConfiguration()
    return () => { active = false }
  }, [])

  const addDomain = async () => {
    if (!configured || busy || domains.length >= 2 || !newDomain.trim()) return

    setAdding(true)
    setError(null)
    try {
      const response = await fetch("/api/domains/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, domain: newDomain.trim() }),
      })
      const data = await response.json()

      if (data.domain) {
        setDomains((prev) => [...prev.filter((domain) => domain.id !== data.domain.id), data.domain])
        setNewDomain("")
      }
      if (!response.ok || !data.domain) setError(data.error || "Failed to add domain")
    } catch {
      setError("Failed to add domain. Please try again.")
    } finally {
      setAdding(false)
    }
  }

  const verifyDomain = async (domainId: string) => {
    if (!configured || busy) return

    setVerifying(domainId)
    setError(null)
    try {
      const response = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      })
      const data = await response.json()

      if (data.domain) {
        setDomains((prev) => prev.map((domain) => domain.id === domainId ? data.domain : domain))
      }
      if (!response.ok || !data.domain) setError(data.error || "Failed to check domain")
    } catch {
      setError("Failed to check domain. Please try again.")
    } finally {
      setVerifying(null)
    }
  }

  const removeDomain = async (domainId: string) => {
    if (!configured || busy || !confirm("Are you sure you want to remove this domain?")) return

    setRemoving(domainId)
    setError(null)
    try {
      const response = await fetch("/api/domains/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setDomains((prev) => prev.filter((domain) => domain.id !== domainId))
      } else {
        setError(data.error || "Failed to remove domain")
      }
    } catch {
      setError("Failed to remove domain. Please try again.")
    } finally {
      setRemoving(null)
    }
  }

  if (configurationError) return <p role="alert" className="text-sm text-red-600">{configurationError}</p>
  if (configured === null) return <p role="status" className="text-sm text-gray-600">Checking custom domain availability...</p>
  if (!configured) return <p className="text-sm text-gray-600">Custom domains are not available yet</p>

  return (
    <div>
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {domains.length > 0 && (
        <div className="space-y-3 mb-6">
          {domains.map((domain) => {
            const config = STATUS_CONFIG[domain.status as keyof typeof STATUS_CONFIG] ||
              STATUS_CONFIG.pending_verification
            const StatusIcon = config.icon
            const records = dnsRecords(domain.verification)

            return (
              <div key={domain.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium text-gray-900 break-all">{domain.domain}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                      <StatusIcon aria-hidden="true" className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => verifyDomain(domain.id)}
                      disabled={busy}
                      aria-label={`Check again for ${domain.domain}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      <RefreshCw aria-hidden="true" className={`w-4 h-4 ${verifying === domain.id ? "animate-spin" : ""}`} />
                      {verifying === domain.id ? "Checking..." : "Check again"}
                    </button>
                    <button
                      onClick={() => removeDomain(domain.id)}
                      disabled={busy}
                      aria-label={`Remove ${domain.domain}`}
                      className="p-1.5 text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {domain.lastError && <p className="mt-2 text-sm text-red-600">Last error: {domain.lastError}</p>}
                {records.length > 0 ? (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3">
                    <p className="mb-2 text-sm text-blue-900">
                      Set these records at your DNS provider, then select Check again.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <caption className="sr-only">DNS records for {domain.domain}</caption>
                        <thead>
                          <tr>
                            <th scope="col" className="pr-3 pb-1">Type</th>
                            <th scope="col" className="pr-3 pb-1">Name</th>
                            <th scope="col" className="pb-1">Value</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {records.map((record, index) => (
                            <tr key={`${record.type}-${record.name}-${index}`}>
                              <td className="pr-3 py-1 align-top">{record.type}</td>
                              <td className="pr-3 py-1 align-top break-all">{record.name}</td>
                              <td className="py-1 align-top break-all">{record.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-blue-800">DNS changes can take time to propagate. Preserve unrelated records, including email records.</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-600">No DNS instructions are available yet. Select Check again to refresh them.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={(event) => { event.preventDefault(); void addDomain() }}>
        <label htmlFor="custom-domain" className="mb-1 block text-sm font-medium text-gray-700">Domain name</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="custom-domain"
            type="text"
            value={newDomain}
            onChange={(event) => setNewDomain(event.target.value)}
            placeholder="yourdomain.com"
            autoCapitalize="none"
            spellCheck={false}
            disabled={busy || domains.length >= 2}
            className="min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || domains.length >= 2 || !newDomain.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            {adding ? "Adding..." : "Add Domain"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-600">Up to 2 domains per site. Enter a domain without a scheme or path.</p>
      </form>
    </div>
  )
}
