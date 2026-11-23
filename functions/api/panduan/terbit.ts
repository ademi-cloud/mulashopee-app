import { requireAdmin } from '../../../lib/panduan/admin'
import { fetchBlocks, getPage } from '../../../lib/panduan/notion'
import { publishPage } from '../../../lib/panduan/publish'
import { listExistingImages, makeImageCopier, upsertLesson } from '../../../lib/panduan/store'
import { missingConfig, type PanduanEnv } from '../../../lib/panduan/env'

/** Terbit SATU panduan (had 50 subrequest bagi setiap request di pelan percuma Cloudflare). */
export const onRequestPost: PagesFunction<PanduanEnv> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env)
  if (!admin.ok) return admin.response
  const bad = missingConfig(env)
  if (bad) return bad
  const pageId = new URL(request.url).searchParams.get('page')
  if (!pageId) return Response.json({ ok: false, ralat: 'Parameter page diperlukan' }, { status: 400 })
  try {
    const stats = { requests: 0 }
    const [page, blocks, existing] = await Promise.all([
      getPage(env.NOTION_TOKEN, pageId),
      fetchBlocks(env.NOTION_TOKEN, pageId, stats),
      listExistingImages(env),
    ])
    // Had 50: semakan admin (2) + halaman (1) + senarai gambar (1) + simpan (1) + block + margin (3).
    const left = 50 - 3 - 2 - 1 - 1 - 1 - stats.requests
    if (left < 0) {
      return Response.json({ ok: false, ralat: 'Panduan terlalu panjang untuk diterbitkan sekali gus — pecahkan kepada beberapa panduan' }, { status: 422 })
    }
    const result = await publishPage(page, blocks, {
      copyImage: makeImageCopier(env, existing, { left }),
      upsertLesson: (row) => upsertLesson(env, row),
    })
    return Response.json(result, { status: result.ok ? 200 : 422 })
  } catch (e) {
    return Response.json({ ok: false, ralat: (e as Error).message }, { status: 502 })
  }
}
