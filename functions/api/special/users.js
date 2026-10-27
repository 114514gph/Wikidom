import { jsonResponse, handleOptions } from '../utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const result = await env.DB.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.role, u.created_at,
           (SELECT COUNT(*) FROM pages p WHERE p.creator_id = u.id) as edit_count
    FROM users u
    ORDER BY u.created_at ASC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  return jsonResponse({
    users: result.results || [],
    total: result.results?.length || 0,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
