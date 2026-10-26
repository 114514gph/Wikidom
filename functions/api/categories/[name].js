import { jsonResponse, errorResponse, handleOptions } from '../utils.js';

// 获取分类详情及分类下的页面
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const categoryName = decodeURIComponent(params.name);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const category = await env.DB.prepare(
    'SELECT * FROM categories WHERE name = ?'
  ).bind(categoryName).first();

  if (!category) {
    return errorResponse('分类不存在', 404);
  }

  const pages = await env.DB.prepare(`
    SELECT p.*, u.username as creator_name
    FROM pages p
    JOIN page_categories pc ON p.id = pc.page_id
    LEFT JOIN users u ON p.creator_id = u.id
    WHERE pc.category_id = ? AND p.deleted_at IS NULL
    ORDER BY p.updated_at DESC
    LIMIT ? OFFSET ?
  `).bind(category.id, limit, offset).all();

  const countResult = await env.DB.prepare(`
    SELECT COUNT(*) as total
    FROM page_categories pc
    JOIN pages p ON pc.page_id = p.id
    WHERE pc.category_id = ? AND p.deleted_at IS NULL
  `).bind(category.id).first();

  return jsonResponse({
    category,
    pages: pages.results || [],
    pagination: {
      page,
      limit,
      total: countResult?.total || 0,
      totalPages: Math.ceil((countResult?.total || 0) / limit),
    },
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
