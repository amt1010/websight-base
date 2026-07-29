import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCrawl, getCrawl, listCrawls } from "./crawls";

describe("createCrawl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends domain and guestToken in the body when no clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ crawlId: 1, remainingScans: 0 }) });
    const result = await createCrawl({ domain: "example.com", guestToken: "g1" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/crawls"),
      expect.objectContaining({ method: "POST" })
    );
    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ domain: "example.com", guestToken: "g1" });
    expect(options.headers.Authorization).toBeUndefined();
    expect(result).toEqual({ crawlId: 1, remainingScans: 0 });
  });

  it("sends a bearer token and omits guestToken when clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ crawlId: 2, remainingScans: 4 }) });
    await createCrawl({ domain: "example.com", clerkToken: "jwt123" });
    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer jwt123");
    expect(JSON.parse(options.body)).toEqual({ domain: "example.com" });
  });

  it("throws ApiError(402) on quota exceeded", async () => {
    fetch.mockResolvedValue({ ok: false, status: 402, json: async () => ({ plan: "Guest", scanLimit: 1, used: 1 }) });
    await expect(createCrawl({ domain: "example.com", guestToken: "g1" })).rejects.toMatchObject({ status: 402 });
  });
});

describe("getCrawl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("GETs with a guestToken query param when no clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1, status: "queued" }) });
    await getCrawl(1, { guestToken: "g1" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/crawls/1?guestToken=g1"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("GETs with a bearer header and no query param when clerkToken is present", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1, status: "done" }) });
    await getCrawl(1, { clerkToken: "jwt123" });
    const [url, options] = fetch.mock.calls[0];
    expect(url).not.toContain("guestToken");
    expect(options.headers.Authorization).toBe("Bearer jwt123");
  });
});

describe("listCrawls", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("GETs /api/crawls with a guestToken query param", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ crawls: [] }) });
    const result = await listCrawls({ guestToken: "g1" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/crawls?guestToken=g1"),
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual({ crawls: [] });
  });
});
