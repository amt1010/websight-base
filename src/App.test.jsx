import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the Overview tab by default", () => {
    render(<App />);
    expect(screen.getByText("Baylor Scott & White Health")).toBeInTheDocument();
  });

  it("switches tabs when a sidebar item is clicked", () => {
    render(<App />);
    const nav = screen.getByText("APIs");
    fireEvent.click(nav);
    expect(screen.getByText("Phynd Provider Directory API")).toBeInTheDocument();
  });

  it("runs the fake analyze/loading sequence when Analyze is clicked", async () => {
    render(<App />);
    const analyzeButton = screen.getByRole("button", { name: /analyze/i });

    fireEvent.click(analyzeButton);
    expect(screen.getByText("Analyzing website")).toBeInTheDocument();
    expect(analyzeButton).toBeDisabled();

    // advance through all STEP_LABELS ticks (500ms each) plus the trailing timeout
    await vi.advanceTimersByTimeAsync(6 * 500 + 500);

    expect(screen.queryByText("Analyzing website")).not.toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /analyze/i })).getByText(/analyze/i)).toBeInTheDocument();
  });
});
