import { jsonResponse, errorResponse, handleOptions } from '../utils.js';

// 获取所有分类
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let where = '';
  const params = [];

  if (search) {
    where = ' WHERE c.name LIKE ?';
    params.push(`%${search}%`);
  }

  const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM categories c ${where}`).bind(...params).first();

  const result = await env.DB.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM page_categories pc WHERE pc.category_id = c.id) as page_count
    FROM categories c
    ${where}
    ORDER BY page_count DESC, c.name ASC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  return jsonResponse({
    categories: result.results || [],
    total: countResult?.total || 0,
    page,
    limit,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
