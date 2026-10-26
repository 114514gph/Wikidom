import { jsonResponse, errorResponse, handleOptions } from '../utils.js';

// 特殊页面：所有页面
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'allpages';
  const namespace = url.searchParams.get('namespace') || 'main';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  if (type === 'allpages') {
    // 所有页面
    const result = await env.DB.prepare(`
      SELECT id, title, namespace, slug, updated_at, creator_id, views
      FROM pages
      WHERE deleted_at IS NULL AND namespace = ?
      ORDER BY title ASC
      LIMIT ? OFFSET ?
    `).bind(namespace, limit, offset).all();

    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM pages
      WHERE deleted_at IS NULL AND namespace = ?
    `).bind(namespace).first();

    return jsonResponse({
      pages: result.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit),
      },
    });
  }

  if (type === 'recentchanges') {
    // 最近更改
    const result = await env.DB.prepare(`
      SELECT v.*, p.title, p.namespace, p.slug, u.username as editor_name
      FROM versions v
      JOIN pages p ON v.page_id = p.id
      LEFT JOIN users u ON v.editor_id = u.id
      WHERE p.deleted_at IS NULL
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return jsonResponse({ changes: result.results || [] });
  }

  if (type === 'random') {
    // 随机页面
    const page = await env.DB.prepare(`
      SELECT * FROM pages
      WHERE deleted_at IS NULL AND namespace = ?
      ORDER BY RANDOM() LIMIT 1
    `).bind(namespace).first();

    return jsonResponse({ page });
  }

  return errorResponse('未知的特殊页面类型', 400);
}

export async function onRequestOptions() {
  return handleOptions();
}
