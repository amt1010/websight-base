import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PagePreview } from "./PagePreview";

describe("PagePreview", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a 'no preview available' state when there is no page", () => {
    render(<PagePreview page={null} />);
    expect(screen.getByText("No preview available")).toBeInTheDocument();
  });

  it("shows the screenshot and fetched HTML on success", async () => {
    fetch.mockResolvedValue({ ok: true, text: async () => "<html>hi</html>" });
    render(<PagePreview page={{ path: "/a", screenshotUrl: "https://r2.example/a.png", htmlUrl: "https://r2.example/a.html" }} />);
    expect(screen.getByAltText("Screenshot of /a")).toHaveAttribute("src", "https://r2.example/a.png");
    expect(await screen.findByText("<html>hi</html>")).toBeInTheDocument();
  });

  it("falls back to a link when the HTML fetch fails", async () => {
    fetch.mockRejectedValue(new Error("network error"));
    render(<PagePreview page={{ path: "/a", screenshotUrl: "https://r2.example/a.png", htmlUrl: "https://r2.example/a.html" }} />);
    const link = await screen.findByRole("link", { name: /view raw html/i });
    expect(link).toHaveAttribute("href", "https://r2.example/a.html");
  });

  it("falls back to a link when the fetch response is not ok", async () => {
    fetch.mockResolvedValue({ ok: false, status: 403 });
    render(<PagePreview page={{ path: "/a", screenshotUrl: "https://r2.example/a.png", htmlUrl: "https://r2.example/a.html" }} />);
    expect(await screen.findByRole("link", { name: /view raw html/i })).toBeInTheDocument();
  });

  it("shows 'no screenshot available' when screenshotUrl is null", () => {
    render(<PagePreview page={{ path: "/a", screenshotUrl: null, htmlUrl: null }} />);
    expect(screen.getByText("No screenshot available")).toBeInTheDocument();
  });

  it("falls back to 'Screenshot unavailable' when a present screenshotUrl fails to load", () => {
    render(<PagePreview page={{ path: "/a", screenshotUrl: "https://r2.example/broken.png", htmlUrl: null }} />);
    const img = screen.getByAltText("Screenshot of /a");
    fireEvent.error(img);
    expect(screen.getByText("Screenshot unavailable")).toBeInTheDocument();
  });

  it("shows 'no HTML captured' and skips fetching when htmlUrl is null", () => {
    render(<PagePreview page={{ path: "/a", screenshotUrl: null, htmlUrl: null }} />);
    expect(screen.getByText("No HTML captured for this page.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
