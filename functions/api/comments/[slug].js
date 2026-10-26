import { jsonResponse, errorResponse, parseTitle, getUserFromRequest, handleOptions } from '../utils.js';

// 获取页面评论
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const fullSlug = decodeURIComponent(params.slug || '');
  const { namespace, slug } = parseTitle(fullSlug);

  const page = await env.DB.prepare(
    'SELECT id FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
  ).bind(namespace, slug).first();

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  const comments = await env.DB.prepare(`
    SELECT c.*, u.username as author_name, u.avatar_url as author_avatar
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.page_id = ? AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC
  `).bind(page.id).all();

  // 构建评论树
  const commentTree = buildCommentTree(comments.results || []);

  return jsonResponse({ comments: commentTree });
}

// 添加评论
export async function onRequestPost(context) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env);

  if (!user) {
    return errorResponse('请先登录', 401);
  }

  const fullSlug = decodeURIComponent(params.slug || '');
  const { namespace, slug } = parseTitle(fullSlug);

  const page = await env.DB.prepare(
    'SELECT id FROM pages WHERE namespace = ? AND slug = ? AND deleted_at IS NULL'
  ).bind(namespace, slug).first();

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  const { content, parentId = null } = await request.json();

  if (!content || !content.trim()) {
    return errorResponse('评论内容不能为空', 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO comments (page_id, parent_id, author_id, content)
    VALUES (?, ?, ?, ?)
  `).bind(page.id, parentId, user.id, content).run();

  const comment = await env.DB.prepare(`
    SELECT c.*, u.username as author_name, u.avatar_url as author_avatar
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.id = ?
  `).bind(result.meta.last_row_id).first();

  return jsonResponse({ comment }, 201);
}

// 构建评论树
function buildCommentTree(comments) {
  const map = {};
  const roots = [];

  comments.forEach(c => {
    map[c.id] = { ...c, children: [] };
  });

  comments.forEach(c => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });

  return roots;
}

export async function onRequestOptions() {
  return handleOptions();
}
