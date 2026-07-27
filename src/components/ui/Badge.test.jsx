import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge label="High" />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});
