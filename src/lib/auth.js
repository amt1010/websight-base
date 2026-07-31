const GUEST_TOKEN_KEY = "websight_guest_token";
export const GUEST_SCAN_LIMIT = 1;

let memoryGuestToken = null;

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateGuestToken() {
  try {
    let token = window.localStorage.getItem(GUEST_TOKEN_KEY);
    if (!token) {
      token = randomToken();
      window.localStorage.setItem(GUEST_TOKEN_KEY, token);
    }
    return token;
  } catch {
    if (!memoryGuestToken) memoryGuestToken = randomToken();
    return memoryGuestToken;
  }
}

export function clearGuestToken() {
  try {
    window.localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {
    // ignore
  }
  memoryGuestToken = null;
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiFetch(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

export function fetchGuestInit(guestToken) {
  return apiFetch("/api/scans/guest-init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestToken }),
  });
}

export function fetchMe(clerkToken) {
  return apiFetch("/api/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${clerkToken}` },
  });
}

export function consumeScan({ guestToken, clerkToken } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (clerkToken) headers.Authorization = `Bearer ${clerkToken}`;
  return apiFetch("/api/scans/consume", {
    method: "POST",
    headers,
    body: JSON.stringify(clerkToken ? {} : { guestToken }),
  });
}
