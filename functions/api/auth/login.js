import { jsonResponse, errorResponse, generateToken, getUserFromRequest, handleOptions } from '../utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, password } = await request.json();

  if (!username || !password) {
    return errorResponse('请填写用户名和密码', 400);
  }

  // 简单密码哈希（实际应该用 Web Crypto API 的 PBKDF2）
  const encoder = new TextEncoder();
  const passwordHash = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  const hashHex = Array.from(new Uint8Array(passwordHash)).map(b => b.toString(16).padStart(2, '0')).join('');

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE username = ? AND password_hash = ?'
  ).bind(username, hashHex).first();

  if (!user) {
    return errorResponse('用户名或密码错误', 401);
  }

  const token = generateToken();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    sessionId,
    user.id,
    token,
    expiresAt,
    request.headers.get('CF-Connecting-IP'),
    request.headers.get('User-Agent')
  ).run();

  return jsonResponse({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      avatar_url: user.avatar_url,
      bio: user.bio,
    },
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
