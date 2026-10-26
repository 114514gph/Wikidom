import { jsonResponse, errorResponse, getUserFromRequest, handleOptions } from '../utils.js';

// 永久删除页面
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env);
  const pageId = parseInt(params.id);

  if (!user) {
    return errorResponse('请先登录', 401);
  }

  const page = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(pageId).first();

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  // 普通用户只能永久删除自己删除的页面
  if (user.role === 'user' && page.deleted_by !== user.id) {
    return errorResponse('您只能永久删除自己删除的页面', 403);
  }

  // 从回收站删除
  await env.DB.prepare('DELETE FROM trash WHERE page_id = ?').bind(pageId).run();

  // 永久删除页面（关联的版本、评论、分类关联会级联删除）
  await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(pageId).run();

  return jsonResponse({ success: true });
}

export async function onRequestOptions() {
  return handleOptions();
}
