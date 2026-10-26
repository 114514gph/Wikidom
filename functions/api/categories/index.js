import { jsonResponse, errorResponse, handleOptions } from '../utils.js';

// 获取所有分类
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const search = url.searchParams.get('search');

  let query = `
    SELECT c.*,
           (SELECT COUNT(*) FROM page_categories pc WHERE pc.category_id = c.id) as page_count
    FROM categories c
  `;
  const params = [];

  if (search) {
    query += ' WHERE c.name LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY page_count DESC, c.name ASC';

  const result = await env.DB.prepare(query).bind(...params).all();

  return jsonResponse({ categories: result.results || [] });
}

export async function onRequestOptions() {
  return handleOptions();
}
