import { jsonResponse, getUserFromRequest, handleOptions } from '../utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env);

  if (!user) {
    return jsonResponse({ user: null }, 200);
  }

  return jsonResponse({ user });
}

export async function onRequestOptions() {
  return handleOptions();
}
