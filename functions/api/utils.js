// 通用工具函数
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// 从标题解析命名空间
export function parseTitle(fullTitle) {
  const colonIndex = fullTitle.indexOf(':');
  if (colonIndex === -1) {
    return { namespace: 'main', title: fullTitle, slug: fullTitle };
  }
  const namespace = fullTitle.substring(0, colonIndex).toLowerCase();
  const title = fullTitle.substring(colonIndex + 1);
  return { namespace, title, slug: fullTitle };
}

// 验证用户权限
export function checkPermission(user, action, namespace = 'main') {
  if (!user) return false;

  // 系统命名空间
  const systemNamespaces = ['user', 'template', 'category', 'help', 'special', 'mediawiki'];

  if (user.role === 'admin') return true;

  if (user.role === 'moderator') {
    if (systemNamespaces.includes(namespace) && action === 'create') return false;
    return true;
  }

  // 普通用户
  if (systemNamespaces.includes(namespace)) {
    return false;
  }

  return true;
}

// 从 Authorization header 获取用户
export async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const session = await env.DB.prepare(
    `SELECT s.*, u.id as user_id, u.username, u.email, u.display_name, u.role, u.avatar_url, u.bio
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).bind(token).first();

  if (!session) return null;

  return {
    id: session.user_id,
    username: session.username,
    email: session.email,
    display_name: session.display_name,
    role: session.role,
    avatar_url: session.avatar_url,
    bio: session.bio,
  };
}

// 生成随机 token
export function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 处理 CORS
export function handleOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
