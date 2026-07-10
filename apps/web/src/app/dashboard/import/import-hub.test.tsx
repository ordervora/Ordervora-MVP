import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}));

const mockCreateImportJob = vi.fn();
vi.mock("@/lib/api", () => ({
  createImportJob: (...args: unknown[]) => mockCreateImportJob(...args),
}));

import { ImportHub } from "./import-hub";

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    sourceType: "IMAGE",
    status: "PENDING",
    extractedData: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ImportHub — unified source grid", () => {
  it("shows every source together in one grid, with no separate Start Import button", () => {
    render(<ImportHub activeJob={null} otherActiveCount={0} />);

    for (const label of ["Photo", "PDF", "Spreadsheet", "Website", "Google Maps", "DoorDash", "Uber Eats", "Grubhub", "Toast", "Clover", "Square", "SpotOn", "Revel"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /start import/i })).not.toBeInTheDocument();
  });

  it("shows a Coming soon note instead of a fake workflow when tapping an unsupported source", () => {
    render(<ImportHub activeJob={null} otherActiveCount={0} />);

    fireEvent.click(screen.getByText("DoorDash"));

    expect(screen.getByText(/DoorDash import is coming soon/)).toBeInTheDocument();
    expect(mockCreateImportJob).not.toHaveBeenCalled();
  });

  it("labels enterprise-tier POS platforms distinctly from plain coming-soon ones", () => {
    render(<ImportHub activeJob={null} otherActiveCount={0} />);

    fireEvent.click(screen.getByText("Toast"));
    expect(screen.getByText(/Toast import is coming soon \(Enterprise\)/)).toBeInTheDocument();
  });
});

describe("ImportHub — auto-start on selection", () => {
  it("starts the import immediately when a file is chosen for an available source, no confirmation step", async () => {
    mockCreateImportJob.mockResolvedValue({ job: job({ sourceType: "PDF", status: "PENDING" }) });
    render(<ImportHub activeJob={null} otherActiveCount={0} />);

    fireEvent.click(screen.getByText("PDF"));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["%PDF-1.4"], "menu.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(mockCreateImportJob).toHaveBeenCalledWith("PDF", { file }));
    await waitFor(() => expect(screen.getByText("BUILDING YOUR MENU")).toBeInTheDocument());
  });

  it("starts the import when Enter is pressed in a URL field, no separate submit button required", async () => {
    mockCreateImportJob.mockResolvedValue({ job: job({ sourceType: "WEBSITE", status: "PENDING" }) });
    render(<ImportHub activeJob={null} otherActiveCount={0} />);

    fireEvent.click(screen.getByText("Website"));
    const urlInput = screen.getByPlaceholderText("https://example.com/menu");
    fireEvent.change(urlInput, { target: { value: "https://example.com/menu" } });
    fireEvent.keyDown(urlInput, { key: "Enter" });

    await waitFor(() => expect(mockCreateImportJob).toHaveBeenCalledWith("WEBSITE", { url: "https://example.com/menu" }));
  });

  it("uploads multiple selected photos as separate jobs", async () => {
    mockCreateImportJob.mockResolvedValue({ job: job() });
    render(<ImportHub activeJob={null} otherActiveCount={0} />);

    fireEvent.click(screen.getByText("Photo"));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [new File(["a"], "1.jpg", { type: "image/jpeg" }), new File(["b"], "2.jpg", { type: "image/jpeg" })];
    fireEvent.change(fileInput, { target: { files } });

    await waitFor(() => expect(mockCreateImportJob).toHaveBeenCalledTimes(2));
  });
});

describe("ImportHub — live progress and completion, in place", () => {
  it("renders live progress instead of the picker while a job is active", () => {
    render(<ImportHub activeJob={job({ status: "PROCESSING" })} otherActiveCount={0} />);

    expect(screen.getByText("BUILDING YOUR MENU")).toBeInTheDocument();
    expect(screen.queryByText("Import your menu")).not.toBeInTheDocument();
  });

  it("shows a Menu Ready completion state with counts and a Review Menu link once awaiting review", () => {
    const readyJob = job({
      status: "AWAITING_REVIEW",
      extractedData: { categories: [{ name: "Mains", items: [{ name: "Burger", priceCents: 999 }, { name: "Fries", priceCents: 399 }] }] },
    });
    render(<ImportHub activeJob={readyJob} otherActiveCount={0} />);

    expect(screen.getByText("Menu Ready")).toBeInTheDocument();
    expect(screen.getByText(/2 products across 1 category/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review Menu" })).toHaveAttribute("href", "/dashboard/import/job-1");
  });

  it("mentions other imports still processing in the background", () => {
    render(<ImportHub activeJob={job({ status: "PROCESSING" })} otherActiveCount={2} />);

    expect(screen.getByText(/2 more photos processing in the background/)).toBeInTheDocument();
  });
});
