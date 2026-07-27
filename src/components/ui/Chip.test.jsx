import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders its label", () => {
    render(<Chip label="healthcare" />);
    expect(screen.getByText("healthcare")).toBeInTheDocument();
  });
});
