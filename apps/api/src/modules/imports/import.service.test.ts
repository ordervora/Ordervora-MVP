import { ImportStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    importJob: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../../lib/file-storage", () => ({
  fileStorage: { save: vi.fn(), read: vi.fn() },
}));

vi.mock("./job-runner", () => ({
  importJobRunner: { enqueue: vi.fn() },
}));

vi.mock("../menu/menu.service", () => ({
  createCategory: vi.fn(),
  createItem: vi.fn(),
}));

import { fileStorage } from "../../lib/file-storage";
import { prisma } from "../../lib/prisma";
import { createCategory, createItem } from "../menu/menu.service";
import { ImportJobNotFoundError, ImportJobNotReadyError } from "./import.errors";
import { approveJob, createImportJob, rejectJob } from "./import.service";
import { importJobRunner } from "./job-runner";

const mockPrisma = vi.mocked(prisma, { deep: true });
const mockFileStorage = vi.mocked(fileStorage, { deep: true });
const mockJobRunner = vi.mocked(importJobRunner, { deep: true });
const mockCreateCategory = vi.mocked(createCategory);
const mockCreateItem = vi.mocked(createItem);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createImportJob", () => {
  it("saves the file, creates the job row, and enqueues the runner", async () => {
    mockFileStorage.save.mockResolvedValue({ path: "/uploads/abc.pdf" });
    mockPrisma.importJob.create.mockResolvedValue({ id: "job-1" } as never);

    const job = await createImportJob(
      "restaurant-1",
      "user-1",
      { sourceType: "PDF" as never },
      { buffer: Buffer.from("x"), mimeType: "application/pdf", originalName: "menu.pdf" },
    );

    expect(job).toEqual({ id: "job-1" });
    expect(mockFileStorage.save).toHaveBeenCalledWith(Buffer.from("x"), "menu.pdf");
    expect(mockPrisma.importJob.create).toHaveBeenCalledWith({
      data: {
        restaurantId: "restaurant-1",
        createdById: "user-1",
        sourceType: "PDF",
        sourceFilePath: "/uploads/abc.pdf",
      },
    });
    expect(mockJobRunner.enqueue).toHaveBeenCalledWith("job-1", {
      kind: "file",
      buffer: Buffer.from("x"),
      mimeType: "application/pdf",
    });
  });
});

describe("tenant isolation", () => {
  it("rejects approving a job that belongs to a different restaurant", async () => {
    mockPrisma.importJob.findUnique.mockResolvedValue({ id: "job-1", restaurantId: "other-restaurant" } as never);

    await expect(approveJob("my-restaurant", "job-1")).rejects.toBeInstanceOf(ImportJobNotFoundError);
    expect(mockPrisma.importJob.update).not.toHaveBeenCalled();
  });

  it("rejects rejecting a job that belongs to a different restaurant", async () => {
    mockPrisma.importJob.findUnique.mockResolvedValue({ id: "job-1", restaurantId: "other-restaurant" } as never);

    await expect(rejectJob("my-restaurant", "job-1")).rejects.toBeInstanceOf(ImportJobNotFoundError);
  });
});

describe("approveJob", () => {
  it("rejects a job that isn't awaiting review", async () => {
    mockPrisma.importJob.findUnique.mockResolvedValue({
      id: "job-1",
      restaurantId: "my-restaurant",
      status: ImportStatus.PROCESSING,
      extractedData: null,
    } as never);

    await expect(approveJob("my-restaurant", "job-1")).rejects.toBeInstanceOf(ImportJobNotReadyError);
    expect(mockCreateCategory).not.toHaveBeenCalled();
  });

  it("commits extracted categories/items into the menu, scoped to the caller's restaurant", async () => {
    mockPrisma.importJob.findUnique.mockResolvedValue({
      id: "job-1",
      restaurantId: "my-restaurant",
      status: ImportStatus.AWAITING_REVIEW,
      extractedData: {
        categories: [{ name: "Appetizers", items: [{ name: "Spring Rolls", priceCents: 599 }] }],
      },
    } as never);
    mockCreateCategory.mockResolvedValue({ id: "category-1" } as never);
    mockPrisma.importJob.update.mockResolvedValue({ id: "job-1", status: ImportStatus.APPROVED } as never);

    const result = await approveJob("my-restaurant", "job-1");

    expect(mockCreateCategory).toHaveBeenCalledWith("my-restaurant", { name: "Appetizers" });
    expect(mockCreateItem).toHaveBeenCalledWith("my-restaurant", {
      categoryId: "category-1",
      name: "Spring Rolls",
      description: undefined,
      priceCents: 599,
    });
    expect(result).toEqual({ id: "job-1", status: ImportStatus.APPROVED });
  });
});
