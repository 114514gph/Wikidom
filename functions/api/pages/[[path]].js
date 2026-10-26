import { jsonResponse, errorResponse, getUserFromRequest, checkPermission, handleOptions } from '../utils.js';

export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;
    const pathParts = params.path || [];
    const namespace = (pathParts[0] || 'main').toLowerCase();
    const slug = decodeURIComponent(pathParts.slice(1).join('/'));

    if (!slug) {
      return errorResponse('页面不存在', 404);
    }

    const dbSlug = namespace === 'main' ? slug : `${namespace}:${slug}`;

    const page = await env.DB.prepare(`
      SELECT p.*, u.username as creator_name
      FROM pages p
      LEFT JOIN users u ON p.creator_id = u.id
      WHERE p.namespace = ? AND p.slug = ? AND p.deleted_at IS NULL
    `).bind(namespace, dbSlug).first();

    if (!page) {
      return errorResponse('页面不存在', 404);
    }

    await env.DB.prepare('UPDATE pages SET views = views + 1 WHERE id = ?').bind(page.id).run();

    const categories = await env.DB.prepare(`
      SELECT c.name, c.id
      FROM categories c
      JOIN page_categories pc ON c.id = pc.category_id
      WHERE pc.page_id = ?
    `).bind(page.id).all();

    page.categories = categories.results || [];

    return jsonResponse({ page });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function onRequestPut(context) {
  try {
    const { request, env, params } = context;
    const user = await getUserFromRequest(request, env);
    if (!user) return errorResponse('请先登录', 401);

    const pathParts = params.path || [];
    const namespace = (pathParts[0] || 'main').toLowerCase();
    const slug = decodeURIComponent(pathParts.slice(1).join('/'));
    const dbSlug = namespace === 'main' ? slug : `${namespace}:${slug}`;

    const page = await env.DB.prepare(
      'SELECT * FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
    ).bind(namespace, dbSlug).first();

    if (!page) return errorResponse('页面不存在', 404);
    if (!checkPermission(user, 'edit', namespace)) return errorResponse('您没有权限编辑此页面', 403);

    const body = await request.json();
    const { content, syntax, categories: cats, edit_summary = '', is_minor = false } = body;

    const maxVersion = await env.DB.prepare(
      'SELECT MAX(version) as max_version FROM versions WHERE page_id = ?'
    ).bind(page.id).first();
    const newVersion = (maxVersion?.max_version || 0) + 1;

    await env.DB.prepare(`
      UPDATE pages SET content = ?, syntax = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(
      content !== undefined ? content : page.content,
      syntax !== undefined ? syntax : page.syntax,
      page.id
    ).run();

    await env.DB.prepare(`
      INSERT INTO versions (page_id, version, content, editor_id, edit_summary, is_minor)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(page.id, newVersion, content !== undefined ? content : page.content, user.id, edit_summary, is_minor ? 1 : 0).run();

    const updatedPage = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(page.id).first();
    return jsonResponse(updatedPage);
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const { request, env, params } = context;
    const user = await getUserFromRequest(request, env);
    if (!user) return errorResponse('请先登录', 401);

    const pathParts = params.path || [];
    const namespace = (pathParts[0] || 'main').toLowerCase();
    const slug = decodeURIComponent(pathParts.slice(1).join('/'));
    const dbSlug = namespace === 'main' ? slug : `${namespace}:${slug}`;

    const page = await env.DB.prepare(
      'SELECT * FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
    ).bind(namespace, dbSlug).first();

    if (!page) return errorResponse('页面不存在', 404);
    if (user.role === 'user' && page.creator_id !== user.id) return errorResponse('您只能删除自己创建的页面', 403);

    await env.DB.prepare('UPDATE pages SET deleted_at = datetime(\'now\'), deleted_by = ? WHERE id = ?').bind(user.id, page.id).run();
    await env.DB.prepare('INSERT INTO trash (page_id, deleted_by, reason) VALUES (?, ?, ?)').bind(page.id, user.id, '').run();

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return handleOptions();
}
