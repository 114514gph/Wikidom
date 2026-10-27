import { jsonResponse, handleOptions } from '../utils.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const username = params.username;

  const user = await env.DB.prepare(`
    SELECT id, username, email, display_name, avatar_url, bio, role, created_at
    FROM users WHERE username = ?
  `).bind(username).first();

  if (!user) {
    return jsonResponse({ error: '用户不存在' }, 404);
  }

  return jsonResponse(user);
}

export async function onRequestOptions() {
  return handleOptions();
}
