import { jsonResponse, errorResponse, parseTitle, handleOptions } from '../utils.js';

// 获取页面列表
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const namespace = url.searchParams.get('namespace') || 'main';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const search = url.searchParams.get('search');
  const category = url.searchParams.get('category');
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, u.username as creator_name,
           (SELECT COUNT(*) FROM versions v WHERE v.page_id = p.id) as version_count
    FROM pages p
    LEFT JOIN users u ON p.creator_id = u.id
    WHERE p.deleted_at IS NULL
  `;
  const params = [];

  if (namespace !== 'all') {
    query += ' AND p.namespace = ?';
    params.push(namespace);
  }

  if (search) {
    query += ' AND (p.title LIKE ? OR p.content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    query += `
      AND p.id IN (
        SELECT pc.page_id FROM page_categories pc
        JOIN categories c ON pc.category_id = c.id
        WHERE c.name = ?
      )
    `;
    params.push(category);
  }

  // 获取总数
  const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM').split('ORDER BY')[0];
  const countResult = await env.DB.prepare(countQuery).bind(...params).first();
  const total = countResult?.total || 0;

  query += ' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...params).all();

  return jsonResponse({
    pages: result.results || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
