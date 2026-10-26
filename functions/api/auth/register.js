import { jsonResponse, errorResponse, generateToken, handleOptions } from '../utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, email, password } = await request.json();

  if (!username || !email || !password) {
    return errorResponse('请填写所有必填字段', 400);
  }

  if (username.length < 3 || username.length > 20) {
    return errorResponse('用户名长度必须在 3-20 个字符之间', 400);
  }

  if (password.length < 6) {
    return errorResponse('密码长度至少 6 个字符', 400);
  }

  // 检查用户名是否已存在
  const existingUser = await env.DB.prepare(
    'SELECT id FROM users WHERE username = ? OR email = ?'
  ).bind(username, email).first();

  if (existingUser) {
    return errorResponse('用户名或邮箱已被注册', 409);
  }

  // 密码哈希
  const encoder = new TextEncoder();
  const passwordHash = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  const hashHex = Array.from(new Uint8Array(passwordHash)).map(b => b.toString(16).padStart(2, '0')).join('');

  // 检查是否是第一个用户（自动设为管理员）
  const userCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
  const role = userCount.count === 0 ? 'admin' : 'user';

  const result = await env.DB.prepare(
    `INSERT INTO users (username, email, password_hash, display_name, role)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(username, email, hashHex, username, role).run();

  const userId = result.meta.last_row_id;

  // 创建会话
  const token = generateToken();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token, expires_at)
     VALUES (?, ?, ?, ?)`
  ).bind(sessionId, userId, token, expiresAt).run();

  return jsonResponse({
    token,
    user: {
      id: userId,
      username,
      email,
      display_name: username,
      role,
    },
  }, 201);
}

export async function onRequestOptions() {
  return handleOptions();
}
