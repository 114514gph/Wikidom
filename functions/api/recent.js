import { jsonResponse, handleOptions } from './utils.js';

// 最近更改
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const result = await env.DB.prepare(`
    SELECT v.id, v.page_id, v.version, v.edit_summary, v.is_minor, v.created_at,
           p.title, p.namespace, p.slug,
           u.username as editor_name
    FROM versions v
    JOIN pages p ON v.page_id = p.id
    LEFT JOIN users u ON v.editor_id = u.id
    WHERE p.deleted_at IS NULL
    ORDER BY v.created_at DESC
    LIMIT ?
  `).bind(limit).all();

  return jsonResponse({
    changes: result.results || [],
    total: result.results?.length || 0,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
