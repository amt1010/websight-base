import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HomePage } from "./HomePage";

const openSignIn = vi.fn();

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ openSignIn }),
}));

vi.mock("../lib/auth", async () => {
  const actual = await vi.importActual("../lib/auth");
  return { ...actual, getOrCreateGuestToken: vi.fn(), fetchGuestInit: vi.fn() };
});

import { getOrCreateGuestToken, fetchGuestInit } from "../lib/auth";

describe("HomePage", () => {
  beforeEach(() => {
    openSignIn.mockClear();
    getOrCreateGuestToken.mockReset().mockReturnValue("guest-token-1");
    fetchGuestInit.mockReset();
  });

  it("renders the hero and both entry buttons", () => {
    render(<HomePage onGuestAccess={() => {}} />);
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
  });

  it("calls openSignIn when 'Log in' is clicked", () => {
    render(<HomePage onGuestAccess={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(openSignIn).toHaveBeenCalledTimes(1);
  });

  it("initializes a guest session and reports access on 'Continue as Guest'", async () => {
    fetchGuestInit.mockResolvedValue({ guestToken: "guest-token-1", remainingScans: 1 });
    const onGuestAccess = vi.fn();
    render(<HomePage onGuestAccess={onGuestAccess} />);

    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));

    await waitFor(() => expect(onGuestAccess).toHaveBeenCalledTimes(1));
    expect(fetchGuestInit).toHaveBeenCalledWith("guest-token-1");
    expect(onGuestAccess).toHaveBeenCalledWith({
      tier: "guest",
      planName: "Guest",
      scanLimit: 1,
      remainingScans: 1,
      loading: false,
      error: null,
    });
  });

  it("shows an inline error and does not call onGuestAccess if guest-init fails", async () => {
    fetchGuestInit.mockRejectedValue(new Error("network down"));
    const onGuestAccess = vi.fn();
    render(<HomePage onGuestAccess={onGuestAccess} />);

    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }));

    await waitFor(() =>
      expect(screen.getByText(/couldn.t start your guest session/i)).toBeInTheDocument()
    );
    expect(onGuestAccess).not.toHaveBeenCalled();
  });
});
