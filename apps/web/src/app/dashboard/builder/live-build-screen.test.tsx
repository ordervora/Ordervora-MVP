import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveBuildScreen } from "./live-build-screen";

describe("LiveBuildScreen", () => {
  it("shows the restaurant name and marks earlier steps as done", () => {
    render(<LiveBuildScreen restaurantName="Joe's Diner" activeStepId="ASSEMBLY" />);

    expect(screen.getByText(/Building Joe's Diner's digital home/)).toBeInTheDocument();
    expect(screen.getByText("Theme Selection")).toBeInTheDocument();
    expect(screen.getByText("Homepage Creation")).toBeInTheDocument();
  });

  it("shows the error message and retry button when one is provided", () => {
    const onRetry = () => {};
    render(
      <LiveBuildScreen restaurantName="Joe's Diner" activeStepId="BRAND_ANALYSIS" errorMessage="AI unavailable" onRetry={onRetry} />,
    );

    expect(screen.getByText("AI unavailable")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("does not show a retry button when none is provided", () => {
    render(<LiveBuildScreen restaurantName="Joe's Diner" activeStepId="THEME_SELECTION" />);
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
  });
});
