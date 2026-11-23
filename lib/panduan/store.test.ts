import { afterEach, describe, expect, it, vi } from 'vitest'
import { imageKey, makeImageCopier } from './store'

const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' }
afterEach(() => vi.unstubAllGlobals())

describe('imageKey', () => {
  it('is stable across signed URLs of the same Notion file and differs between files', async () => {
    const a1 = await imageKey('https://prod-files.s3.amazonaws.com/ws/file-1/gambar.png?X-Amz-Signature=aaa')
    const a2 = await imageKey('https://prod-files.s3.amazonaws.com/ws/file-1/gambar.png?X-Amz-Signature=bbb')
    const b = await imageKey('https://prod-files.s3.amazonaws.com/ws/file-2/gambar.png?X-Amz-Signature=aaa')
    expect(a1).toBe(a2)
    expect(a1).not.toBe(b)
    expect(a1).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('makeImageCopier', () => {
  it('reuses images already in storage without downloading', async () => {
    const key = await imageKey('https://s3/ws/f1/a.png?sig=1')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const copy = makeImageCopier(env, new Set([`img/${key}`]), { left: 10 })
    expect(await copy('https://s3/ws/f1/a.png?sig=2')).toEqual({ src: `https://sb.test/storage/v1/object/public/panduan/img/${key}` })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('downloads and uploads a new image, spending two requests', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.startsWith('https://s3') ? new Response('png', { headers: { 'Content-Type': 'image/png' } }) : new Response('{}'))))
    const budget = { left: 10 }
    const r = await makeImageCopier(env, new Set(), budget)('https://s3/ws/f2/b.png?sig=1')
    expect('src' in r && r.src.startsWith('https://sb.test/storage/v1/object/public/panduan/img/')).toBe(true)
    expect(budget.left).toBe(8)
  })

  it('asks to wait when the request budget is used up', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await makeImageCopier(env, new Set(), { left: 1 })('https://s3/ws/f3/c.png')).toEqual({ nanti: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
