import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrCreateGuestToken,
  fetchGuestInit,
  fetchMe,
  consumeScan,
  ApiError,
  GUEST_SCAN_LIMIT,
} from "./auth";

describe("GUEST_SCAN_LIMIT", () => {
  it("is 1, mirroring the backend's hardcoded guest limit", () => {
    expect(GUEST_SCAN_LIMIT).toBe(1);
  });
});

describe("getOrCreateGuestToken", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a token on first call and persists it to localStorage", () => {
    const token = getOrCreateGuestToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(localStorage.getItem("websight_guest_token")).toBe(token);
  });

  it("reuses the same token on a second call", () => {
    const first = getOrCreateGuestToken();
    const second = getOrCreateGuestToken();
    expect(second).toBe(first);
  });

  it("falls back to an in-memory token when localStorage throws", () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const token = getOrCreateGuestToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    spy.mockRestore();
  });
});

describe("fetchGuestInit", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("POSTs to /api/scans/guest-init with the token and returns the parsed body", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ guestToken: "abc", remainingScans: 1 }),
    });

    const result = await fetchGuestInit("abc");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/scans/guest-init"),
      expect.objectContaining({ method: "POST" })
    );
    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ guestToken: "abc" });
    expect(result).toEqual({ guestToken: "abc", remainingScans: 1 });
  });

  it("throws ApiError with the response status and body on a non-ok response", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "guestToken must be a non-empty string" }),
    });

    await expect(fetchGuestInit("")).rejects.toMatchObject({
      status: 400,
      body: { error: "guestToken must be a non-empty string" },
    });
  });
});

describe("fetchMe", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("GETs /api/me with a bearer token and returns the parsed body", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        email: "a@b.com",
        role: "user",
        plan: { name: "Free", tier: "free", scanLimit: 3 },
        remainingScans: 3,
      }),
    });

    const result = await fetchMe("jwt123");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/me"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer jwt123" }),
      })
    );
    expect(result.plan.tier).toBe("free");
  });
});

describe("consumeScan", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends the guestToken in the body when no clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ remainingScans: 0 }) });

    await consumeScan({ guestToken: "g1" });

    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ guestToken: "g1" });
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("sends a bearer token and an empty body when clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ remainingScans: 2 }) });

    await consumeScan({ clerkToken: "jwt123" });

    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer jwt123");
    expect(JSON.parse(options.body)).toEqual({});
  });

  it("throws ApiError(402) with plan/scanLimit/used on quota exceeded", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ plan: "Guest", scanLimit: 1, used: 1 }),
    });

    await expect(consumeScan({ guestToken: "g1" })).rejects.toBeInstanceOf(ApiError);
    await expect(consumeScan({ guestToken: "g1" })).rejects.toMatchObject({
      status: 402,
      body: { plan: "Guest", scanLimit: 1, used: 1 },
    });
  });
});
