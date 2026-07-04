import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUseRestaurantBuilder = vi.fn();
vi.mock("./use-restaurant-builder", () => ({
  useRestaurantBuilder: () => mockUseRestaurantBuilder(),
}));

vi.mock("./live-build-screen", () => ({
  LiveBuildScreen: ({ activeStepId, errorMessage }: { activeStepId: string; errorMessage: string | null }) => (
    <div data-testid="live-build-screen">
      {activeStepId} {errorMessage}
    </div>
  ),
}));

vi.mock("./finale-reveal", () => ({
  FinaleReveal: ({ restaurantName }: { restaurantName: string }) => <div data-testid="finale-reveal">{restaurantName}</div>,
}));

import { BuilderExperience } from "./builder-experience";

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    phase: "loading",
    job: null,
    siteId: null,
    siteSlug: null,
    publishedVersionId: null,
    finishStepId: "SELECTING",
    finishFailure: null,
    qrToken: null,
    qrError: null,
    bootstrapError: null,
    retryGeneration: vi.fn(),
    retryFinish: vi.fn(),
    retryBootstrap: vi.fn(),
    ...overrides,
  };
}

describe("BuilderExperience", () => {
  it("shows a loading message while bootstrapping", () => {
    mockUseRestaurantBuilder.mockReturnValue(baseState({ phase: "loading" }));
    render(<BuilderExperience restaurantName="Joe's Diner" />);
    expect(screen.getByText(/Joe's Diner/)).toBeInTheDocument();
  });

  it("renders the live build screen while generating", () => {
    mockUseRestaurantBuilder.mockReturnValue(
      baseState({ phase: "generating", job: { id: "j1", stage: "THEME_SELECTION", status: "RUNNING", error: null } }),
    );
    render(<BuilderExperience restaurantName="Joe's Diner" />);
    expect(screen.getByTestId("live-build-screen")).toHaveTextContent("THEME_SELECTION");
  });

  it("surfaces the generation error message when generation failed", () => {
    mockUseRestaurantBuilder.mockReturnValue(
      baseState({ phase: "generation_failed", job: { id: "j1", stage: "SCORING", status: "FAILED", error: "AI unavailable" } }),
    );
    render(<BuilderExperience restaurantName="Joe's Diner" />);
    expect(screen.getByTestId("live-build-screen")).toHaveTextContent("AI unavailable");
  });

  it("shows the finish step during the post-generation finishing phase", () => {
    mockUseRestaurantBuilder.mockReturnValue(baseState({ phase: "finishing", finishStepId: "PUBLISHING" }));
    render(<BuilderExperience restaurantName="Joe's Diner" />);
    expect(screen.getByTestId("live-build-screen")).toHaveTextContent("PUBLISHING");
  });

  it("renders the finale reveal when done", () => {
    mockUseRestaurantBuilder.mockReturnValue(baseState({ phase: "done", siteId: "site-1", siteSlug: "joes" }));
    render(<BuilderExperience restaurantName="Joe's Diner" />);
    expect(screen.getByTestId("finale-reveal")).toHaveTextContent("Joe's Diner");
  });

  it("shows a bootstrap error with a retry button", () => {
    mockUseRestaurantBuilder.mockReturnValue(baseState({ phase: "bootstrap_failed", bootstrapError: "Network down" }));
    render(<BuilderExperience restaurantName="Joe's Diner" />);
    expect(screen.getByText("Network down")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });
});
