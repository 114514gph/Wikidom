import { jsonResponse, errorResponse, parseTitle, getUserFromRequest, checkPermission, handleOptions } from '../../utils.js';

// 获取单个版本
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const fullSlug = decodeURIComponent(params.slug || '');
  const versionId = parseInt(params.version);
  const { namespace, slug } = parseTitle(fullSlug);

  const page = await env.DB.prepare(
    'SELECT * FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
  ).bind(namespace, slug).first();

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  const version = await env.DB.prepare(`
    SELECT v.*, u.username as editor_name
    FROM versions v
    LEFT JOIN users u ON v.editor_id = u.id
    WHERE v.page_id = ? AND v.id = ?
  `).bind(page.id, versionId).first();

  if (!version) {
    return errorResponse('版本不存在', 404);
  }

  return jsonResponse({ version });
}

// 回滚到指定版本
export async function onRequestPost(context) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env);

  if (!user) {
    return errorResponse('请先登录', 401);
  }

  const fullSlug = decodeURIComponent(params.slug || '');
  const versionId = parseInt(params.version);
  const { namespace, slug } = parseTitle(fullSlug);

  const page = await env.DB.prepare(
    'SELECT * FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
  ).bind(namespace, slug).first();

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  if (!checkPermission(user, 'edit', namespace)) {
    return errorResponse('您没有权限回滚此页面', 403);
  }

  const targetVersion = await env.DB.prepare(
    'SELECT * FROM versions WHERE id = ? AND page_id = ?'
  ).bind(versionId, page.id).first();

  if (!targetVersion) {
    return errorResponse('目标版本不存在', 404);
  }

  // 获取最大版本号
  const maxVersion = await env.DB.prepare(
    'SELECT MAX(version) as max_version FROM versions WHERE page_id = ?'
  ).bind(page.id).first();

  const newVersion = (maxVersion?.max_version || 0) + 1;

  // 更新页面
  await env.DB.prepare(`
    UPDATE pages SET content = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(targetVersion.content, page.id).run();

  // 创建新版本
  await env.DB.prepare(`
    INSERT INTO versions (page_id, version, content, editor_id, edit_summary)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    page.id,
    newVersion,
    targetVersion.content,
    user.id,
    `回滚到版本 ${targetVersion.version}`
  ).run();

  return jsonResponse({ success: true, newVersion });
}

export async function onRequestOptions() {
  return handleOptions();
}
