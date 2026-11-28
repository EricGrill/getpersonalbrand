import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from './prisma'
import { clientIp, rateLimit } from './rate-limit'

vi.mock('./prisma', () => ({ prisma: { $queryRaw: vi.fn() } }))

const query = vi.mocked(prisma.$queryRaw)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:10Z'))
  query.mockReset()
})

afterEach(() => vi.useRealTimers())

describe('rateLimit', () => {
  it('allows the limit, blocks subsequent requests, and starts a new window', async () => {
    query.mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 1 }])
    const options = { key: 'login:client', limit: 2, windowSeconds: 60 }

    await expect(rateLimit(options)).resolves.toEqual({ ok: true, remaining: 1 })
    await expect(rateLimit(options)).resolves.toEqual({ ok: true, remaining: 0 })
    await expect(rateLimit(options)).resolves.toEqual({ ok: false, remaining: 0 })
    expect(query.mock.calls[0][2]).toEqual(new Date('2026-01-01T00:00:00Z'))

    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    await expect(rateLimit(options)).resolves.toEqual({ ok: true, remaining: 1 })
    expect(query.mock.calls[3][2]).toEqual(new Date('2026-01-01T00:01:00Z'))
  })

  it('uses a parameterized atomic upsert for untrusted keys', async () => {
    query.mockResolvedValue([{ count: 1 }])
    const key = "client'; DROP TABLE users; --"
    await rateLimit({ key, limit: 2, windowSeconds: 60 })
    const [sql, value] = query.mock.calls[0]
    expect(Array.from(sql as TemplateStringsArray).join('?')).toContain('ON CONFLICT')
    expect(Array.from(sql as TemplateStringsArray).join('?')).not.toContain(key)
    expect(value).toBe(key)
  })

  it.each([
    { key: '', limit: 1, windowSeconds: 60 },
    { key: 'x', limit: 0, windowSeconds: 60 },
    { key: 'x', limit: 1.5, windowSeconds: 60 },
    { key: 'x', limit: Infinity, windowSeconds: 60 },
    { key: 'x', limit: 1, windowSeconds: 0 },
    { key: 'x', limit: 1, windowSeconds: -1 },
    { key: 'x', limit: 1, windowSeconds: 0.5 },
  ])('rejects invalid options: %j', async (options) => {
    await expect(rateLimit(options)).rejects.toThrow('Rate limit requires')
    expect(query).not.toHaveBeenCalled()
  })

  it('propagates database failures instead of silently allowing a request', async () => {
    query.mockRejectedValue(new Error('database unavailable'))
    await expect(rateLimit({ key: 'x', limit: 2, windowSeconds: 60 }))
      .rejects.toThrow('database unavailable')
  })
})

describe('clientIp', () => {
  it('prefers the Vercel proxy header and supports IPv6', () => {
    expect(clientIp(new Headers({
      'x-vercel-forwarded-for': '2001:db8::1',
      'x-forwarded-for': '192.0.2.2',
    }))).toBe('2001:db8::1')
  })

  it('takes the first forwarded address or the real IP fallback', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '192.0.2.1, 192.0.2.2' }))).toBe('192.0.2.1')
    expect(clientIp(new Headers({ 'x-real-ip': '192.0.2.3' }))).toBe('192.0.2.3')
  })

  it('uses one unknown bucket for missing or malformed addresses', () => {
    expect(clientIp(new Headers())).toBe('unknown')
    expect(clientIp(new Headers({ 'x-forwarded-for': 'not-an-ip' }))).toBe('unknown')
  })
})
