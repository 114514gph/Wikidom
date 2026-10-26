import { jsonResponse, errorResponse, getUserFromRequest, handleOptions } from '../utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ success: true });

  const token = authHeader.substring(7);
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();

  return jsonResponse({ success: true });
}

export async function onRequestOptions() {
  return handleOptions();
}
