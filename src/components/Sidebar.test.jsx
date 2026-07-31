import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const projects = [{ id: 1, name: "example.com", status: "done", date: "Jul 29, 2:00 PM" }];

describe("Sidebar", () => {
  it("renders all nav tabs and the project list", () => {
    render(<Sidebar tab="overview" setTab={() => {}} projects={projects} />);
    for (const label of ["Overview", "Sitemap", "Templates", "X-Ray", "APIs", "Export"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("calls setTab with the clicked tab's id", () => {
    const setTab = vi.fn();
    render(<Sidebar tab="overview" setTab={setTab} projects={projects} />);
    fireEvent.click(screen.getByText("Sitemap"));
    expect(setTab).toHaveBeenCalledWith("sitemap");
  });

  it("shows lock icons on the 4 restricted tabs when access is not paid", () => {
    render(
      <Sidebar tab="overview" setTab={() => {}} projects={projects} access={{ tier: "guest" }} />
    );
    for (const label of ["Templates", "X-Ray", "APIs", "Export"]) {
      expect(within(screen.getByText(label).closest("button")).getByText("🔒")).toBeInTheDocument();
    }
    for (const label of ["Overview", "Sitemap"]) {
      expect(within(screen.getByText(label).closest("button")).queryByText("🔒")).not.toBeInTheDocument();
    }
  });

  it("shows no lock icons when access.tier is paid", () => {
    render(<Sidebar tab="overview" setTab={() => {}} projects={projects} access={{ tier: "paid" }} />);
    expect(screen.queryByText("🔒")).not.toBeInTheDocument();
  });

  it("calls onLogout when the Log out button is clicked", () => {
    const onLogout = vi.fn();
    render(<Sidebar tab="overview" setTab={() => {}} projects={projects} onLogout={onLogout} />);
    fireEvent.click(screen.getByText("Log out"));
    expect(onLogout).toHaveBeenCalled();
  });

  it("shows status labels for done, running, and queued projects", () => {
    const statuses = [
      { id: 1, name: "a.com", status: "done", date: "Jul 29" },
      { id: 2, name: "b.com", status: "running", date: "Jul 29" },
      { id: 3, name: "c.com", status: "queued", date: "Jul 29" },
    ];
    render(<Sidebar tab="overview" setTab={() => {}} projects={statuses} />);
    expect(screen.getByText("✓ Done")).toBeInTheDocument();
    expect(screen.getByText("… Running")).toBeInTheDocument();
    expect(screen.getByText("… Queued")).toBeInTheDocument();
  });
});
