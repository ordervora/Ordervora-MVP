import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface FileStorage {
  save(buffer: Buffer, originalName: string): Promise<{ path: string }>;
  read(storedPath: string): Promise<Buffer>;
}

/**
 * MVP implementation writes to local disk. Swappable for S3/GCS later
 * without changing any caller — they only depend on the FileStorage interface.
 */
class LocalDiskFileStorage implements FileStorage {
  private readonly baseDir = path.resolve(process.env.IMPORT_UPLOAD_DIR ?? "uploads");

  async save(buffer: Buffer, originalName: string): Promise<{ path: string }> {
    await mkdir(this.baseDir, { recursive: true });
    const safeExtension = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "");
    const storedPath = path.join(this.baseDir, `${randomUUID()}${safeExtension}`);
    await writeFile(storedPath, buffer);
    return { path: storedPath };
  }

  async read(storedPath: string): Promise<Buffer> {
    return readFile(storedPath);
  }
}

export const fileStorage: FileStorage = new LocalDiskFileStorage();
