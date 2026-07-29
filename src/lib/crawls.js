import { apiFetch } from "./auth";

export function createCrawl({ domain, guestToken, clerkToken }) {
  const headers = { "Content-Type": "application/json" };
  if (clerkToken) headers.Authorization = `Bearer ${clerkToken}`;
  return apiFetch("/api/crawls", {
    method: "POST",
    headers,
    body: JSON.stringify(clerkToken ? { domain } : { domain, guestToken }),
  });
}

export function getCrawl(id, { guestToken, clerkToken } = {}) {
  const headers = {};
  let path = `/api/crawls/${id}`;
  if (clerkToken) {
    headers.Authorization = `Bearer ${clerkToken}`;
  } else if (guestToken) {
    path += `?guestToken=${encodeURIComponent(guestToken)}`;
  }
  return apiFetch(path, { method: "GET", headers });
}

export function listCrawls({ guestToken, clerkToken } = {}) {
  const headers = {};
  let path = "/api/crawls";
  if (clerkToken) {
    headers.Authorization = `Bearer ${clerkToken}`;
  } else if (guestToken) {
    path += `?guestToken=${encodeURIComponent(guestToken)}`;
  }
  return apiFetch(path, { method: "GET", headers });
}
