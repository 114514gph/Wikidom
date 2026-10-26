import { jsonResponse, errorResponse, getUserFromRequest, handleOptions } from '../utils.js';

// 获取回收站内容
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env);

  if (!user) {
    return errorResponse('请先登录', 401);
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let query = `
    SELECT t.*, p.title, p.namespace, p.slug, p.content,
           u.username as deleted_by_name
    FROM trash t
    JOIN pages p ON t.page_id = p.id
    LEFT JOIN users u ON t.deleted_by = u.id
    WHERE p.deleted_at IS NOT NULL
  `;
  const params = [];

  // 普通用户只能看到自己删除的页面
  if (user.role === 'user') {
    query += ' AND t.deleted_by = ?';
    params.push(user.id);
  }

  const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = await env.DB.prepare(countQuery).bind(...params).first();

  query += ' ORDER BY t.deleted_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...params).all();

  return jsonResponse({
    items: result.results || [],
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
