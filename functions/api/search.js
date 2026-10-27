import { jsonResponse, handleOptions } from './utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const limit = parseInt(url.searchParams.get('limit') || '20');

  if (!q) {
    return jsonResponse({ results: [], total: 0 });
  }

  const result = await env.DB.prepare(`
    SELECT id, title, namespace, slug,
           substr(content, 1, 200) as snippet,
           updated_at
    FROM pages
    WHERE deleted_at IS NULL AND (title LIKE ? OR content LIKE ?)
    ORDER BY updated_at DESC
    LIMIT ?
  `).bind(`%${q}%`, `%${q}%`, limit).all();

  return jsonResponse({
    results: result.results || [],
    total: result.results?.length || 0,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
