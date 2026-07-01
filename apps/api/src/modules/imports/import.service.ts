import type { ImportJob } from "@prisma/client";
import { ImportStatus } from "@prisma/client";
import { fileStorage } from "../../lib/file-storage";
import { prisma } from "../../lib/prisma";
import { createCategory, createItem } from "../menu/menu.service";
import { updateRestaurantById } from "../restaurants/restaurant.service";
import { ImportJobNotFoundError, ImportJobNotReadyError } from "./import.errors";
import type { CreateImportInput } from "./import.validation";
import { importJobRunner } from "./job-runner";
import { extractedMenuDataSchema, type ImportSourceInput } from "./types";

export interface UploadedFile {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export async function createImportJob(
  restaurantId: string,
  createdById: string,
  input: CreateImportInput,
  file?: UploadedFile,
): Promise<ImportJob> {
  let sourceFilePath: string | undefined;
  let sourceInput: ImportSourceInput;

  if (file) {
    const saved = await fileStorage.save(file.buffer, file.originalName);
    sourceFilePath = saved.path;
    sourceInput = { kind: "file", buffer: file.buffer, mimeType: file.mimeType };
  } else {
    if (!input.sourceUrl) {
      throw new Error("createImportJob requires either a file or a sourceUrl");
    }
    sourceInput = { kind: "url", url: input.sourceUrl };
  }

  const job = await prisma.importJob.create({
    data: {
      restaurantId,
      createdById,
      sourceType: input.sourceType,
      sourceFilePath,
      sourceUrl: input.sourceUrl,
    },
  });

  importJobRunner.enqueue(job.id, sourceInput);

  return job;
}

async function findOwnJob(restaurantId: string, jobId: string): Promise<ImportJob> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job || job.restaurantId !== restaurantId) {
    throw new ImportJobNotFoundError();
  }
  return job;
}

export async function getJob(restaurantId: string, jobId: string): Promise<ImportJob> {
  return findOwnJob(restaurantId, jobId);
}

export async function listJobs(restaurantId: string): Promise<ImportJob[]> {
  return prisma.importJob.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" } });
}

export async function approveJob(restaurantId: string, jobId: string): Promise<ImportJob> {
  const job = await findOwnJob(restaurantId, jobId);
  if (job.status !== ImportStatus.AWAITING_REVIEW || !job.extractedData) {
    throw new ImportJobNotReadyError();
  }

  const extracted = extractedMenuDataSchema.parse(job.extractedData);

  for (const category of extracted.categories) {
    const createdCategory = await createCategory(restaurantId, { name: category.name });
    for (const item of category.items) {
      await createItem(restaurantId, {
        categoryId: createdCategory.id,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
      });
    }
  }

  if (extracted.businessProfile) {
    await updateRestaurantById(restaurantId, extracted.businessProfile);
  }

  return prisma.importJob.update({
    where: { id: job.id },
    data: { status: ImportStatus.APPROVED, reviewedAt: new Date() },
  });
}

export async function rejectJob(restaurantId: string, jobId: string): Promise<ImportJob> {
  const job = await findOwnJob(restaurantId, jobId);
  return prisma.importJob.update({
    where: { id: job.id },
    data: { status: ImportStatus.REJECTED, reviewedAt: new Date() },
  });
}
