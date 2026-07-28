import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const projects = [{ id: 1, name: "bswhealth.com", status: "done", score: 94 }];

describe("Sidebar", () => {
  it("renders all nav tabs and the project list", () => {
    render(<Sidebar tab="overview" setTab={() => {}} projects={projects} />);
    for (const label of ["Overview", "Sitemap", "Templates", "X-Ray", "APIs", "Export"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("bswhealth.com")).toBeInTheDocument();
  });

  it("calls setTab with the clicked tab's id", () => {
    const setTab = vi.fn();
    render(<Sidebar tab="overview" setTab={setTab} projects={projects} />);
    fireEvent.click(screen.getByText("Sitemap"));
    expect(setTab).toHaveBeenCalledWith("sitemap");
  });

  it("shows lock icons on the 4 restricted tabs when access is not paid", () => {
    render(
      <Sidebar
        tab="overview"
        setTab={() => {}}
        projects={projects}
        access={{ tier: "guest" }}
      />
    );
    for (const label of ["Templates", "X-Ray", "APIs", "Export"]) {
      expect(within(screen.getByText(label).closest("button")).getByText("🔒")).toBeInTheDocument();
    }
    for (const label of ["Overview", "Sitemap"]) {
      expect(within(screen.getByText(label).closest("button")).queryByText("🔒")).not.toBeInTheDocument();
    }
  });

  it("shows no lock icons when access.tier is paid", () => {
    render(
      <Sidebar
        tab="overview"
        setTab={() => {}}
        projects={projects}
        access={{ tier: "paid" }}
      />
    );
    expect(screen.queryByText("🔒")).not.toBeInTheDocument();
  });
});
