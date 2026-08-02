import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportTab } from "./ExportTab";

const DATA = {
  domain: "example.com",
  metrics: { pages: 10, sections: 2, templates: 3, apis: 1, crawlTime: "1.2s" },
  templates: [{ name: "Blog Post", pattern: "/blog/*", count: 5 }],
  apis: [{ name: "Google Maps", type: "maps", endpoints: ["https://maps.googleapis.com/x"] }],
  pages: [{ url: "https://example.com/", path: "/", depth: 0, status: "ok" }],
};

describe("ExportTab", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render the Figma export or the Share & Collaborate block", () => {
    render(<ExportTab data={DATA} />);
    expect(screen.queryByText(/figma/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/share & collaborate/i)).not.toBeInTheDocument();
  });

  it("downloads a CSV of the pages when the CSV card is clicked", () => {
    render(<ExportTab data={DATA} />);
    fireEvent.click(screen.getByText("CSV — URL inventory"));
    expect(URL.createObjectURL).toHaveBeenCalled();
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("text/csv");
  });

  it("downloads the raw JSON analysis when the JSON card is clicked", () => {
    render(<ExportTab data={DATA} />);
    fireEvent.click(screen.getByText("JSON — raw analysis"));
    expect(URL.createObjectURL).toHaveBeenCalled();
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("application/json");
  });

  it("opens a printable report and calls print() when the PDF card is clicked", () => {
    const printSpy = vi.fn();
    const writeSpy = vi.fn();
    const mockWindow = { document: { write: writeSpy, close: vi.fn() }, focus: vi.fn(), print: printSpy };
    vi.spyOn(window, "open").mockReturnValue(mockWindow);
    render(<ExportTab data={DATA} />);
    fireEvent.click(screen.getByText("PDF Discovery Report"));
    expect(writeSpy).toHaveBeenCalled();
    expect(writeSpy.mock.calls[0][0]).toContain("example.com");
    expect(printSpy).toHaveBeenCalled();
  });

  it("does nothing (no crash) when window.open is blocked and returns null", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    render(<ExportTab data={DATA} />);
    expect(() => fireEvent.click(screen.getByText("PDF Discovery Report"))).not.toThrow();
  });
});
