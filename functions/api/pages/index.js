import { jsonResponse, errorResponse, handleOptions } from '../utils.js';

// 获取页面列表
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const namespace = url.searchParams.get('namespace') || 'main';
  const search = url.searchParams.get('search');
  const category = url.searchParams.get('category');

  let where = 'WHERE p.deleted_at IS NULL';
  const params = [];

  if (namespace && namespace !== 'all') {
    where += ' AND p.namespace = ?';
    params.push(namespace.toLowerCase());
  }

  if (search) {
    where += ' AND (p.title LIKE ? OR p.content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    where += ` AND p.id IN (
      SELECT pc.page_id FROM page_categories pc
      JOIN categories c ON pc.category_id = c.id
      WHERE c.name = ?
    )`;
    params.push(category);
  }

  const countResult = await env.DB.prepare(`
    SELECT COUNT(*) as total FROM pages p ${where}
  `).bind(...params).first();

  const result = await env.DB.prepare(`
    SELECT p.*, u.username as creator_name
    FROM pages p
    LEFT JOIN users u ON p.creator_id = u.id
    ${where}
    ORDER BY p.updated_at DESC
    LIMIT 100
  `).bind(...params).all();

  return jsonResponse({
    pages: result.results || [],
    total: countResult?.total || 0,
  });
}

// 创建页面
export async function onRequestPost(context) {
  const { request, env } = context;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('请先登录', 401);
  }

  const token = authHeader.substring(7);
  const session = await env.DB.prepare(`
    SELECT u.id, u.username, u.role FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token).first();

  if (!session) {
    return errorResponse('请先登录', 401);
  }

  const { title, namespace = 'main', content = '', syntax = 'markdown', categories = [] } = await request.json();

  if (!title) {
    return errorResponse('页面标题不能为空', 400);
  }

  const ns = namespace.toLowerCase();
  const fullTitle = ns === 'main' ? title : `${ns}:${title}`;

  const existing = await env.DB.prepare(
    'SELECT id FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
  ).bind(ns, fullTitle).first();

  if (existing) {
    return errorResponse('页面已存在', 409);
  }

  const result = await env.DB.prepare(`
    INSERT INTO pages (title, namespace, slug, content, syntax, creator_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(title, ns, fullTitle, content, syntax, session.id).run();

  const pageId = result.meta.last_row_id;

  await env.DB.prepare(`
    INSERT INTO versions (page_id, version, content, editor_id, edit_summary)
    VALUES (?, 1, ?, ?, ?)
  `).bind(pageId, content, session.id, '创建页面').run();

  const page = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(pageId).first();
  return jsonResponse(page, 201);
}

export async function onRequestOptions() {
  return handleOptions();
}
