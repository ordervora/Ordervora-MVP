import { ImportStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { importAdapterRegistry } from "./adapters/registry";
import type { ImportSourceInput } from "./types";

export interface ImportJobRunner {
  enqueue(jobId: string, input: ImportSourceInput): void;
}

/**
 * MVP implementation: fires the adapter's extract() call in-process
 * without blocking the HTTP response. This interface is the seam for
 * swapping in a real queue (BullMQ/SQS) later without touching the
 * controller or service.
 */
class InProcessImportJobRunner implements ImportJobRunner {
  enqueue(jobId: string, input: ImportSourceInput): void {
    void this.run(jobId, input);
  }

  private async run(jobId: string, input: ImportSourceInput): Promise<void> {
    try {
      await prisma.importJob.update({ where: { id: jobId }, data: { status: ImportStatus.PROCESSING } });

      const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
      const adapter = importAdapterRegistry.get(job.sourceType);
      if (!adapter) {
        throw new Error(`No adapter registered for source type ${job.sourceType}`);
      }

      const extractedData = await adapter.extract(input);

      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: ImportStatus.AWAITING_REVIEW, extractedData },
      });
    } catch (err) {
      await prisma.importJob
        .update({
          where: { id: jobId },
          data: {
            status: ImportStatus.FAILED,
            errorMessage: err instanceof Error ? err.message : "Import failed",
          },
        })
        .catch(() => undefined);
    }
  }
}

export const importJobRunner: ImportJobRunner = new InProcessImportJobRunner();
