import { jsonResponse, errorResponse, parseTitle, getUserFromRequest, checkPermission, handleOptions } from '../utils.js';

// 获取单个页面
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const fullSlug = decodeURIComponent(params.slug || '');
  const { namespace, title, slug } = parseTitle(fullSlug);

  const page = await env.DB.prepare(`
    SELECT p.*, u.username as creator_name,
           (SELECT COUNT(*) FROM versions v WHERE v.page_id = p.id) as version_count
    FROM pages p
    LEFT JOIN users u ON p.creator_id = u.id
    WHERE p.namespace = ? AND p.slug = ? AND p.deleted_at IS NULL
  `).bind(namespace, slug).first();

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  // 增加浏览次数
  await env.DB.prepare('UPDATE pages SET views = views + 1 WHERE id = ?').bind(page.id).run();

  // 获取分类
  const categories = await env.DB.prepare(`
    SELECT c.name, c.id
    FROM categories c
    JOIN page_categories pc ON c.id = pc.category_id
    WHERE pc.page_id = ?
  `).bind(page.id).all();

  page.categories = categories.results || [];

  return jsonResponse({ page });
}

// 创建页面
export async function onRequestPost(context) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env);

  if (!user) {
    return errorResponse('请先登录', 401);
  }

  const fullSlug = decodeURIComponent(params.slug || '');
  const { namespace, title, slug } = parseTitle(fullSlug);

  if (!checkPermission(user, 'create', namespace)) {
    return errorResponse('您没有权限在此命名空间创建页面', 403);
  }

  const { content, syntax = 'markdown', categories = [], editSummary = '' } = await request.json();

  if (!title) {
    return errorResponse('页面标题不能为空', 400);
  }

  // 检查页面是否已存在
  const existing = await env.DB.prepare(
    'SELECT id FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
  ).bind(namespace, slug).first();

  if (existing) {
    return errorResponse('页面已存在', 409);
  }

  // 创建页面
  const result = await env.DB.prepare(`
    INSERT INTO pages (title, namespace, slug, content, syntax, creator_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(title, namespace, slug, content, syntax, user.id).run();

  const pageId = result.meta.last_row_id;

  // 创建第一个版本
  await env.DB.prepare(`
    INSERT INTO versions (page_id, version, content, editor_id, edit_summary)
    VALUES (?, 1, ?, ?, ?)
  `).bind(pageId, content, user.id, editSummary || '创建页面').run();

  // 添加分类
  for (const categoryName of categories) {
    await addCategoryToPage(env, pageId, categoryName, user.id);
  }

  const page = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(pageId).first();
  return jsonResponse({ page }, 201);
}

// 更新页面
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env);

  if (!user) {
    return errorResponse('请先登录', 401);
  }

  const fullSlug = decodeURIComponent(params.slug || '');
  const { namespace, slug } = parseTitle(fullSlug);

  const page = await env.DB.prepare(
    'SELECT * FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
  ).bind(namespace, slug).first();

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  if (!checkPermission(user, 'edit', namespace)) {
    return errorResponse('您没有权限编辑此页面', 403);
  }

  const { content, syntax, categories, editSummary = '', isMinor = false } = await request.json();

  // 获取当前最大版本号
  const maxVersion = await env.DB.prepare(
    'SELECT MAX(version) as max_version FROM versions WHERE page_id = ?'
  ).bind(page.id).first();

  const newVersion = (maxVersion?.max_version || 0) + 1;

  // 更新页面
  await env.DB.prepare(`
    UPDATE pages
    SET content = ?, syntax = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    content !== undefined ? content : page.content,
    syntax !== undefined ? syntax : page.syntax,
    page.id
  ).run();

  // 创建新版本
  await env.DB.prepare(`
    INSERT INTO versions (page_id, version, content, editor_id, edit_summary, is_minor)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    page.id,
    newVersion,
    content !== undefined ? content : page.content,
    user.id,
    editSummary || '',
    isMinor ? 1 : 0
  ).run();

  // 更新分类
  if (categories !== undefined) {
    await env.DB.prepare('DELETE FROM page_categories WHERE page_id = ?').bind(page.id).run();
    for (const categoryName of categories) {
      await addCategoryToPage(env, page.id, categoryName, user.id);
    }
  }

  const updatedPage = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(page.id).first();
  return jsonResponse({ page: updatedPage });
}

// 删除页面（移入回收站）
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env);

  if (!user) {
    return errorResponse('请先登录', 401);
  }

  const fullSlug = decodeURIComponent(params.slug || '');
  const { namespace, slug } = parseTitle(fullSlug);

  const page = await env.DB.prepare(
    'SELECT * FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
  ).bind(namespace, slug).first();

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  // 普通用户只能删除自己创建的页面
  if (user.role === 'user' && page.creator_id !== user.id) {
    return errorResponse('您只能删除自己创建的页面', 403);
  }

  if (!checkPermission(user, 'delete', namespace)) {
    return errorResponse('您没有权限删除此页面', 403);
  }

  // 软删除
  await env.DB.prepare(`
    UPDATE pages SET deleted_at = datetime('now'), deleted_by = ? WHERE id = ?
  `).bind(user.id, page.id).run();

  // 加入回收站
  await env.DB.prepare(`
    INSERT INTO trash (page_id, deleted_by, reason)
    VALUES (?, ?, ?)
  `).bind(page.id, user.id, '').run();

  return jsonResponse({ success: true });
}

// 辅助函数：添加分类
async function addCategoryToPage(env, pageId, categoryName, userId) {
  let category = await env.DB.prepare('SELECT * FROM categories WHERE name = ?').bind(categoryName).first();

  if (!category) {
    const result = await env.DB.prepare(`
      INSERT INTO categories (name, creator_id) VALUES (?, ?)
    `).bind(categoryName, userId).run();
    category = { id: result.meta.last_row_id };
  }

  await env.DB.prepare(`
    INSERT OR IGNORE INTO page_categories (page_id, category_id)
    VALUES (?, ?)
  `).bind(pageId, category.id).run();
}

export async function onRequestOptions() {
  return handleOptions();
}
