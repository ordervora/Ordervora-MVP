import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("personalizes the caption with the restaurant name", () => {
    render(<LiveBuildScreen restaurantName="Joe's Diner" activeStepId="INGEST" />);
    expect(screen.getByText(/Joe's Diner's menu and profile/)).toBeInTheDocument();
  });

  it("shows the value-pitch checklist and ticks items off as their gating stage completes", () => {
    render(<LiveBuildScreen restaurantName="Joe's Diner" activeStepId="PUBLISHING" />);
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByText("QR ordering")).toBeInTheDocument();
  });

  it("dramatizes the choice with candidate cards during SELECTING instead of the generic mockup", () => {
    vi.useFakeTimers();
    render(
      <LiveBuildScreen
        restaurantName="Joe's Diner"
        activeStepId="SELECTING"
        candidates={[
          { id: "v-1", colorSeed: "#111111", overall: 60 },
          { id: "v-2", colorSeed: "#e8590c", overall: 92 },
        ]}
        winnerId="v-2"
      />,
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText("Your best fit")).toBeInTheDocument();
    vi.useRealTimers();
  });

  describe("reassurance line", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("appears only after the active stage has run long enough", () => {
      render(<LiveBuildScreen restaurantName="Joe's Diner" activeStepId="ASSEMBLY" />);
      expect(screen.queryByText(/Still working/)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(7000);
      });

      expect(screen.getByText(/Still working/)).toBeInTheDocument();
    });
  });
});
