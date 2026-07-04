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

describe("UploadForm — CSV source (Sprint 10)", () => {
  it("offers CSV / Spreadsheet as an enabled source", () => {
    render(<UploadForm />);

    const csvRadio = screen.getByDisplayValue("CSV");
    expect(csvRadio).toBeEnabled();
  });

  it("shows a file input (not a URL field) once CSV is selected", () => {
    render(<UploadForm />);

    fireEvent.click(screen.getByDisplayValue("CSV"));

    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("https://example.com/menu")).not.toBeInTheDocument();
  });

  it("submits the selected CSV file to createImportJob", async () => {
    mockCreateImportJob.mockResolvedValue({ job: { id: "job-1" } });
    render(<UploadForm />);

    fireEvent.click(screen.getByDisplayValue("CSV"));
    const file = new File(["a,b\n1,2"], "menu.csv", { type: "text/csv" });
    const fileInput = screen.getByText("File").parentElement!.querySelector("input[type='file']")!;
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Import"));

    expect(mockCreateImportJob).toHaveBeenCalledWith("CSV", { file });
  });
});
