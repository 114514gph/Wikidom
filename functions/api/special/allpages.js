import { jsonResponse, handleOptions } from '../utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const namespace = (url.searchParams.get('namespace') || 'main').toLowerCase();
  const prefix = url.searchParams.get('prefix') || '';
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let where = 'WHERE deleted_at IS NULL';
  const params = [];

  if (namespace !== 'all') {
    where += ' AND namespace = ?';
    params.push(namespace);
  }
  if (prefix) {
    where += ' AND title LIKE ?';
    params.push(`${prefix}%`);
  }

  const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM pages ${where}`).bind(...params).first();

  const result = await env.DB.prepare(`
    SELECT id, title, namespace, slug, created_at, updated_at
    FROM pages ${where}
    ORDER BY title ASC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  return jsonResponse({
    pages: result.results || [],
    total: countResult?.total || 0,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
