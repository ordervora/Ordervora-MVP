import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.fn();
const mockListContentGenerations = vi.fn();
const mockRestoreContentGeneration = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    listContentGenerations: (...args: unknown[]) => mockListContentGenerations(...args),
    restoreContentGeneration: (...args: unknown[]) => mockRestoreContentGeneration(...args),
  };
});

import { AiContentPanel } from "./ai-content-panel";
import type { WebsiteSiteDefinition } from "@/lib/api";

function fakeDefinition(): WebsiteSiteDefinition {
  return {
    schemaVersion: 1,
    restaurantName: "Trattoria Bella",
    tagline: "New tagline",
    cuisine: "italian",
    businessType: "bistro",
    styleFamily: "MODERN",
    themeKey: "modern-bistro",
    themeVersion: 1,
    colorSeed: "#e8590c",
    typography: { display: "Sora", body: "Inter" },
    facts: { restaurantName: "Trattoria Bella", hasOnlineOrdering: false, hasReservations: false },
    pages: [{ slug: "/", title: "Home", metaDescription: "x", sections: [] }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListContentGenerations.mockResolvedValue({ generations: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AiContentPanel", () => {
  it("loads and shows version history on mount", async () => {
    mockListContentGenerations.mockResolvedValue({
      generations: [{ id: "gen-1", siteId: "site-1", versionNo: 1, scope: "HERO", pageSlug: "/", status: "COMPLETED", provider: "openai", restoredFromId: null, createdAt: new Date().toISOString() }],
    });

    render(<AiContentPanel siteId="site-1" activePageSlug="/" onGenerated={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Restore")).toBeInTheDocument());
    expect(mockListContentGenerations).toHaveBeenCalledWith("site-1");
  });

  it("shows an empty state when there is no history yet", async () => {
    render(<AiContentPanel siteId="site-1" activePageSlug="/" onGenerated={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/No generations yet/)).toBeInTheDocument());
  });

  it("clicking Generate Website Content calls generateContent with scope FULL and hands the result to onGenerated", async () => {
    mockGenerateContent.mockResolvedValue({ generation: { id: "gen-1" }, definition: fakeDefinition() });
    const onGenerated = vi.fn();

    render(<AiContentPanel siteId="site-1" activePageSlug="/" onGenerated={onGenerated} />);
    await waitFor(() => expect(mockListContentGenerations).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByText("Generate Website Content"));
    });

    await waitFor(() => expect(mockGenerateContent).toHaveBeenCalledWith("site-1", "FULL", "/"));
    expect(onGenerated).toHaveBeenCalledWith(expect.objectContaining({ tagline: "New tagline" }));
  });

  it("clicking a Regenerate button calls generateContent with that scope", async () => {
    mockGenerateContent.mockResolvedValue({ generation: { id: "gen-2" }, definition: fakeDefinition() });

    render(<AiContentPanel siteId="site-1" activePageSlug="/" onGenerated={vi.fn()} />);
    await waitFor(() => expect(mockListContentGenerations).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByText("FAQ"));
    });

    await waitFor(() => expect(mockGenerateContent).toHaveBeenCalledWith("site-1", "FAQ", "/"));
  });

  it("shows an error message when generation fails", async () => {
    mockGenerateContent.mockRejectedValue(new Error("Rate limit exceeded"));

    render(<AiContentPanel siteId="site-1" activePageSlug="/" onGenerated={vi.fn()} />);
    await waitFor(() => expect(mockListContentGenerations).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByText("Generate Website Content"));
    });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Rate limit exceeded"));
  });

  it("clicking Restore calls restoreContentGeneration and hands the result to onGenerated", async () => {
    mockListContentGenerations.mockResolvedValue({
      generations: [{ id: "gen-1", siteId: "site-1", versionNo: 1, scope: "HERO", pageSlug: "/", status: "COMPLETED", provider: "openai", restoredFromId: null, createdAt: new Date().toISOString() }],
    });
    mockRestoreContentGeneration.mockResolvedValue({ generation: { id: "gen-3" }, definition: fakeDefinition() });
    const onGenerated = vi.fn();

    render(<AiContentPanel siteId="site-1" activePageSlug="/" onGenerated={onGenerated} />);
    await waitFor(() => expect(screen.getByText("Restore")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText("Restore"));
    });

    await waitFor(() => expect(mockRestoreContentGeneration).toHaveBeenCalledWith("site-1", "gen-1"));
    expect(onGenerated).toHaveBeenCalled();
  });

  it("disables the Generate button while a generation is in flight", async () => {
    let resolve!: (value: { generation: { id: string }; definition: WebsiteSiteDefinition }) => void;
    mockGenerateContent.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<AiContentPanel siteId="site-1" activePageSlug="/" onGenerated={vi.fn()} />);
    await waitFor(() => expect(mockListContentGenerations).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Generate Website Content"));
    await waitFor(() => expect(screen.getByText("Generate Website Content").closest("button")).toBeDisabled());

    await act(async () => {
      resolve({ generation: { id: "gen-1" }, definition: fakeDefinition() });
      await Promise.resolve();
    });
  });
});
