import { jsonResponse, errorResponse, parseTitle, handleOptions } from '../utils.js';

// 获取页面历史版本
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const fullSlug = decodeURIComponent(params.slug || '');
  const { namespace, slug } = parseTitle(fullSlug);

  const page = await env.DB.prepare(
    'SELECT * FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
  ).bind(namespace, slug).first();

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  const versions = await env.DB.prepare(`
    SELECT v.*, u.username as editor_name
    FROM versions v
    LEFT JOIN users u ON v.editor_id = u.id
    WHERE v.page_id = ?
    ORDER BY v.version DESC
  `).bind(page.id).all();

  return jsonResponse({
    page: { id: page.id, title: page.title, namespace: page.namespace, slug: page.slug },
    versions: versions.results || [],
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
