import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockCreateImportJob = vi.fn();
vi.mock("@/lib/api", () => ({
  createImportJob: (...args: unknown[]) => mockCreateImportJob(...args),
}));

import { UploadForm } from "./upload-form";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UploadForm — source picker (Sprint 10)", () => {
  it("offers Spreadsheet (CSV) as a selectable source", () => {
    render(<UploadForm />);

    const spreadsheetButton = screen.getByRole("button", { name: /spreadsheet/i });
    expect(spreadsheetButton).toBeEnabled();
  });

  it("shows a file input (not a URL field) once Spreadsheet is selected", () => {
    render(<UploadForm />);

    fireEvent.click(screen.getByRole("button", { name: /spreadsheet/i }));

    expect(screen.getByText("Upload Spreadsheet")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("https://example.com/menu")).not.toBeInTheDocument();
  });

  it("submits the selected CSV file to createImportJob", async () => {
    mockCreateImportJob.mockResolvedValue({ job: { id: "job-1" } });
    render(<UploadForm />);

    fireEvent.click(screen.getByRole("button", { name: /spreadsheet/i }));
    const file = new File(["a,b\n1,2"], "menu.csv", { type: "text/csv" });
    const fileInput = screen.getByText("Choose a file").closest("label")!.querySelector("input[type='file']")!;
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Start import" }));

    expect(mockCreateImportJob).toHaveBeenCalledWith("CSV", { file });
  });

  it("submits a URL source to createImportJob", async () => {
    mockCreateImportJob.mockResolvedValue({ job: { id: "job-2" } });
    render(<UploadForm />);

    fireEvent.click(screen.getByRole("button", { name: /website/i }));
    fireEvent.change(screen.getByPlaceholderText("https://example.com/menu"), { target: { value: "https://example.com/menu.pdf" } });
    fireEvent.click(screen.getByRole("button", { name: "Start import" }));

    expect(mockCreateImportJob).toHaveBeenCalledWith("WEBSITE", { url: "https://example.com/menu.pdf" });
  });
});
