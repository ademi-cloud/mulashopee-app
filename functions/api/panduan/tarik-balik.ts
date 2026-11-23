import { requireAdmin } from '../../../lib/panduan/admin'
import { queryPanduan } from '../../../lib/panduan/notion'
import { pagesToUnpublish } from '../../../lib/panduan/publish'
import { listAppGuides, unpublish } from '../../../lib/panduan/store'
import { missingConfig, type PanduanEnv } from '../../../lib/panduan/env'

/** Sembunyikan panduan yang bukan lagi "Terbit" (atau dipadam) di Notion. */
export const onRequestPost: PagesFunction<PanduanEnv> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env)
  if (!admin.ok) return admin.response
  const bad = missingConfig(env)
  if (bad) return bad
  try {
    const [pages, app] = await Promise.all([queryPanduan(env.NOTION_TOKEN, env.NOTION_PANDUAN_DB_ID), listAppGuides(env)])
    const ids = pagesToUnpublish(
      app.filter((g) => g.published).map((g) => g.notion_page_id),
      pages.filter((p) => p.status === 'Terbit').map((p) => p.id),
    )
    await unpublish(env, ids)
    return Response.json({ ditarik: ids.length })
  } catch (e) {
    return Response.json({ ralat: (e as Error).message }, { status: 502 })
  }
}
