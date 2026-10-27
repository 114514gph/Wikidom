import { jsonResponse, handleOptions } from '../utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const namespace = (url.searchParams.get('namespace') || 'main').toLowerCase();

  const page = await env.DB.prepare(`
    SELECT title, namespace, slug FROM pages
    WHERE deleted_at IS NULL AND namespace = ?
    ORDER BY RANDOM() LIMIT 1
  `).bind(namespace).first();

  if (!page) {
    return jsonResponse({ slug: '', namespace: 'main', title: '' });
  }

  return jsonResponse(page);
}

export async function onRequestOptions() {
  return handleOptions();
}
