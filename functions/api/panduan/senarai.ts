import { requireAdmin } from '../../../lib/panduan/admin'
import { queryPanduan } from '../../../lib/panduan/notion'
import { listAppGuides } from '../../../lib/panduan/store'
import { missingConfig, type PanduanEnv } from '../../../lib/panduan/env'

const sameTime = (a: string | null | undefined, b: string) => !!a && new Date(a).getTime() === new Date(b).getTime()

export const onRequestGet: PagesFunction<PanduanEnv> = async ({ request, env }) => {
  const admin = await requireAdmin(request, env)
  if (!admin.ok) return admin.response
  const bad = missingConfig(env)
  if (bad) return bad
  try {
    const [pages, app] = await Promise.all([queryPanduan(env.NOTION_TOKEN, env.NOTION_PANDUAN_DB_ID), listAppGuides(env)])
    const byId = new Map(app.map((g) => [g.notion_page_id, g]))
    return Response.json({
      panduan: pages
        .sort((a, b) => a.module.localeCompare(b.module) || a.order - b.order)
        .map((p) => {
          const g = byId.get(p.id)
          return {
            pageId: p.id,
            tajuk: p.title || '(tiada tajuk)',
            status: p.status,
            lastEdited: p.lastEdited,
            perluKemasKini: p.status === 'Terbit' && !(g?.published && sameTime(g.notion_edited_at, p.lastEdited)),
          }
        }),
    })
  } catch (e) {
    return Response.json({ ralat: (e as Error).message }, { status: 502 })
  }
}
