import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import App from "./App";

let mockIsSignedIn = false;
const mockGetToken = vi.fn().mockResolvedValue("clerk-jwt-1");
const mockOpenSignIn = vi.fn();

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isSignedIn: mockIsSignedIn, getToken: mockGetToken }),
  useClerk: () => ({ openSignIn: mockOpenSignIn }),
}));

vi.mock("./lib/auth", async () => {
  const actual = await vi.importActual("./lib/auth");
  return {
    ...actual,
    getOrCreateGuestToken: vi.fn(() => "guest-token-1"),
    fetchGuestInit: vi.fn(),
    fetchMe: vi.fn(),
    consumeScan: vi.fn(),
  };
});

import { fetchGuestInit, fetchMe, consumeScan, ApiError } from "./lib/auth";

async function continueAsGuest() {
  fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));
  await vi.waitFor(() => screen.getByText("Baylor Scott & White Health"));
}

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockIsSignedIn = false;
    fetchGuestInit.mockReset().mockResolvedValue({ guestToken: "guest-token-1", remainingScans: 1 });
    fetchMe.mockReset();
    consumeScan.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the home page before any login/guest choice", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
    expect(screen.queryByText("Baylor Scott & White Health")).not.toBeInTheDocument();
  });

  it("renders the Overview tab by default once past the home screen as a guest", async () => {
    render(<App />);
    await continueAsGuest();
    expect(screen.getByText("Baylor Scott & White Health")).toBeInTheDocument();
  });

  it("switches tabs when a sidebar item is clicked", async () => {
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
    render(<App />);
    await vi.waitFor(() => screen.getByText("Baylor Scott & White Health"));
    await vi.waitFor(() => expect(screen.queryByText("🔒")).not.toBeInTheDocument());

    fireEvent.click(screen.getByText("APIs"));
    expect(screen.getByText("Phynd Provider Directory API")).toBeInTheDocument();
  });

  it("runs the fake analyze/loading sequence after a successful consumeScan", async () => {
    consumeScan.mockResolvedValue({ remainingScans: 0 });
    render(<App />);
    await continueAsGuest();

    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    fireEvent.click(analyzeButton);

    await vi.waitFor(() => expect(screen.getByText("Analyzing website")).toBeInTheDocument());
    expect(analyzeButton).toBeDisabled();

    await vi.advanceTimersByTimeAsync(6 * 500 + 500);

    expect(screen.queryByText("Analyzing website")).not.toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /analyze/i })).getByText(/analyze/i)).toBeInTheDocument();
  });

  it("shows a quota-exceeded UpsellNotice instead of the loading animation on a second Analyze click", async () => {
    consumeScan
      .mockResolvedValueOnce({ remainingScans: 0 })
      .mockRejectedValueOnce(new ApiError(402, { plan: "Guest", scanLimit: 1, used: 1 }));
    render(<App />);
    await continueAsGuest();

    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    fireEvent.click(analyzeButton);
    await vi.waitFor(() => expect(screen.getByText("Analyzing website")).toBeInTheDocument());
    await vi.advanceTimersByTimeAsync(6 * 500 + 500);

    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await vi.waitFor(() => expect(screen.getByText("Scan limit reached")).toBeInTheDocument());
    expect(screen.getByText(/log in for more/i)).toBeInTheDocument();
  });
});
