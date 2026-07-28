import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpsellNotice } from "./UpsellNotice";

describe("UpsellNotice", () => {
  it("renders the given title and message", () => {
    render(<UpsellNotice title="Upgrade to unlock this tab" message="This tab is available on paid plans." />);
    expect(screen.getByText("Upgrade to unlock this tab")).toBeInTheDocument();
    expect(screen.getByText("This tab is available on paid plans.")).toBeInTheDocument();
  });
});
