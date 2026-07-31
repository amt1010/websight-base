import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

let mockIsSignedIn = false;
const mockGetToken = vi.fn().mockResolvedValue("clerk-jwt-1");
const mockOpenSignIn = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue();

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isSignedIn: mockIsSignedIn, getToken: mockGetToken }),
  useClerk: () => ({ openSignIn: mockOpenSignIn, signOut: mockSignOut }),
}));

vi.mock("./lib/auth", async () => {
  const actual = await vi.importActual("./lib/auth");
  return {
    ...actual,
    getOrCreateGuestToken: vi.fn(() => "guest-token-1"),
    fetchGuestInit: vi.fn(),
    fetchMe: vi.fn(),
  };
});

vi.mock("./lib/crawls", () => ({
  createCrawl: vi.fn(),
  getCrawl: vi.fn(),
  listCrawls: vi.fn(),
}));

import { fetchGuestInit, fetchMe, ApiError } from "./lib/auth";
import { createCrawl, getCrawl, listCrawls } from "./lib/crawls";

const DONE_CRAWL = {
  id: 1,
  domain: "example.com",
  status: "done",
  startedAt: "2026-07-29T00:00:00.000Z",
  finishedAt: "2026-07-29T00:00:03.000Z",
  error: null,
  pages: [{ url: "https://example.com/", path: "/", depth: 0, status: "ok" }],
  clusters: [{ urlPattern: "/", pageUrls: ["https://example.com/"] }],
  integrations: [{ name: "Google Maps", category: "maps", matchedUrls: ["https://maps.googleapis.com/x"] }],
};

async function continueAsGuest() {
  fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));
  await vi.waitFor(() => screen.getByText(/enter a domain/i));
}

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockIsSignedIn = false;
    mockSignOut.mockClear();
    fetchGuestInit.mockReset().mockResolvedValue({ guestToken: "guest-token-1", remainingScans: 1 });
    fetchMe.mockReset();
    createCrawl.mockReset();
    getCrawl.mockReset();
    listCrawls.mockReset().mockResolvedValue({ crawls: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the home page before any login/guest choice", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
  });

  it("shows an empty state after guest access with no prior crawls", async () => {
    render(<App />);
    await continueAsGuest();
    expect(screen.getByText(/no analysis yet/i)).toBeInTheDocument();
  });

  it("auto-loads the most recent crawl on dashboard entry", async () => {
    listCrawls.mockResolvedValue({
      crawls: [{ id: 1, domain: "example.com", status: "done", startedAt: "2026-07-29T00:00:00.000Z", finishedAt: "2026-07-29T00:00:03.000Z" }],
    });
    getCrawl.mockResolvedValue(DONE_CRAWL);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));
    await vi.waitFor(() => expect(screen.getAllByText("example.com").length).toBeGreaterThan(0));
  });

  it("logs out a guest and returns to the home page", async () => {
    render(<App />);
    await continueAsGuest();
    fireEvent.click(screen.getByText("Log out"));
    await vi.waitFor(() => expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument());
  });

  it("signs out via Clerk and returns to the home page for a logged-in user", async () => {
    mockIsSignedIn = true;
    fetchMe.mockResolvedValue({
      email: "a@b.com",
      role: "user",
      plan: { name: "Pro", tier: "paid", scanLimit: 50 },
      remainingScans: 50,
    });
    listCrawls.mockResolvedValue({ crawls: [] });
    render(<App />);
    await vi.waitFor(() => screen.getByText("Log out"));
    fireEvent.click(screen.getByText("Log out"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("switches tabs", async () => {
    render(<App />);
    await continueAsGuest();
    fireEvent.click(screen.getByText("Sitemap"));
    expect(screen.getByRole("button", { name: /sitemap/i })).toBeInTheDocument();
  });

  it("locks Templates/X-Ray/APIs/Export for a guest and leaves Overview/Sitemap open", async () => {
    render(<App />);
    await continueAsGuest();

    fireEvent.click(screen.getByText("Templates"));
    expect(screen.getByText("Upgrade to unlock this tab")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Sitemap"));
    expect(screen.queryByText("Upgrade to unlock this tab")).not.toBeInTheDocument();
  });

  it("shows real APIs tab content for a paid user", async () => {
    mockIsSignedIn = true;
    fetchMe.mockResolvedValue({
      email: "a@b.com",
      role: "user",
      plan: { name: "Pro", tier: "paid", scanLimit: 50 },
      remainingScans: 50,
    });
    listCrawls.mockResolvedValue({ crawls: [{ id: 1, domain: "example.com", status: "done" }] });
    getCrawl.mockResolvedValue(DONE_CRAWL);
    render(<App />);
    await vi.waitFor(() => expect(screen.queryByText("🔒")).not.toBeInTheDocument());
    await vi.waitFor(() => expect(screen.getAllByText("example.com").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByText("APIs"));
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
  });

  it("runs a real analyze flow: creates a crawl, polls through running, and renders real data once done", async () => {
    createCrawl.mockResolvedValue({ crawlId: 42, remainingScans: 0 });
    getCrawl
      .mockResolvedValueOnce({ id: 42, domain: "example.com", status: "running", startedAt: null, finishedAt: null, error: null })
      .mockResolvedValueOnce(DONE_CRAWL);
    render(<App />);
    await continueAsGuest();

    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "example.com" } });
    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    fireEvent.click(analyzeButton);

    await vi.waitFor(() => expect(screen.getByText("Analyzing website")).toBeInTheDocument());
    expect(analyzeButton).toBeDisabled();

    await vi.advanceTimersByTimeAsync(2000);
    await vi.waitFor(() => expect(screen.getByText("example.com")).toBeInTheDocument());
    expect(screen.queryByText("Analyzing website")).not.toBeInTheDocument();
  });

  it("shows a quota-exceeded UpsellNotice when createCrawl rejects with 402", async () => {
    createCrawl.mockRejectedValue(new ApiError(402, { plan: "Guest", scanLimit: 1, used: 1 }));
    render(<App />);
    await continueAsGuest();

    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await vi.waitFor(() => expect(screen.getByText("Scan limit reached")).toBeInTheDocument());
    expect(screen.getByText(/log in for more/i)).toBeInTheDocument();
  });

  it("shows the crawl's error message when the crawl fails", async () => {
    createCrawl.mockResolvedValue({ crawlId: 43, remainingScans: 0 });
    getCrawl.mockResolvedValue({ id: 43, domain: "example.com", status: "failed", error: "robots.txt disallowed all crawling" });
    render(<App />);
    await continueAsGuest();

    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await vi.waitFor(() => expect(screen.getByText("robots.txt disallowed all crawling")).toBeInTheDocument());
  });
});
