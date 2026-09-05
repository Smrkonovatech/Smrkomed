import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface StoredMediaFile {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
  absolutePath: string;
}

export interface MediaStorageProvider {
  upload(input: {
    clinicId: string;
    providerMediaId: string;
    type: string;
    buffer: Buffer;
    mimeType: string;
    filename?: string | null;
  }): Promise<StoredMediaFile>;

  getBuffer(storageKey: string): Promise<Buffer>;
  exists(storageKey: string): Promise<boolean>;
  delete(storageKey: string): Promise<void>;
  getAccessUrl(mediaId: string): string;
  getAbsolutePath(storageKey: string): string;
}

const MIME_EXTENSIONS: Record<string, string> = {
  "audio/ogg": ".ogg",
  "audio/ogg; codecs=opus": ".ogg",
  "audio/opus": ".opus",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/mp4": ".m4a",
  "audio/m4a": ".m4a",
  "audio/wav": ".wav",
  "audio/aac": ".aac",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/3gpp": ".3gp",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

export function getExtensionForMime(mimeType: string): string {
  const parts = mimeType.split(";");
  const cleanMime = (parts[0] ?? "").trim().toLowerCase();
  return MIME_EXTENSIONS[cleanMime] || MIME_EXTENSIONS[mimeType.toLowerCase()] || "";
}

export function sanitizeFilename(rawName?: string | null): string {
  if (!rawName) return "";
  // Strip null bytes, slashes, and control characters
  return rawName
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/[\x00-\x1f\x80-\x9f]/g, "")
    .trim()
    .slice(0, 200);
}

export class LocalFilesystemMediaStorageProvider implements MediaStorageProvider {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = path.resolve(
      customDir || process.env["MEDIA_STORAGE_DIR"] || path.join(process.cwd(), ".storage", "media"),
    );
  }

  public getRootDirectory(): string {
    return this.baseDir;
  }

  public getAbsolutePath(storageKey: string): string {
    // Prevent directory traversal attacks
    const normalizedKey = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, "");
    const resolved = path.resolve(this.baseDir, normalizedKey);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error("Invalid storageKey: path traversal detected");
    }
    return resolved;
  }

  async upload(input: {
    clinicId: string;
    providerMediaId: string;
    type: string;
    buffer: Buffer;
    mimeType: string;
    filename?: string | null;
  }): Promise<StoredMediaFile> {
    const ext = getExtensionForMime(input.mimeType) || (input.filename ? path.extname(input.filename) : "");
    const safeMediaId = input.providerMediaId.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const safeType = input.type.toLowerCase().replace(/[^a-z0-9]/g, "");
    const fileName = `${safeMediaId}${ext}`;

    // Storage structure: {clinicId}/{type}/{fileName}
    const relativeDir = path.join(input.clinicId, safeType);
    const targetDir = path.join(this.baseDir, relativeDir);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, fileName);
    const storageKey = path.join(relativeDir, fileName).replace(/\\/g, "/");

    await fs.promises.writeFile(targetPath, input.buffer);

    const hash = crypto.createHash("sha256").update(input.buffer).digest("hex");

    return {
      storageKey,
      sizeBytes: input.buffer.length,
      sha256: hash,
      mimeType: input.mimeType,
      absolutePath: targetPath,
    };
  }

  async getBuffer(storageKey: string): Promise<Buffer> {
    const fullPath = this.getAbsolutePath(storageKey);
    return fs.promises.readFile(fullPath);
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      const fullPath = this.getAbsolutePath(storageKey);
      await fs.promises.access(fullPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      const fullPath = this.getAbsolutePath(storageKey);
      await fs.promises.unlink(fullPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }

  getAccessUrl(mediaId: string): string {
    return `/api/v1/whatsapp-automation/inbox/media/${mediaId}`;
  }
}

// Global default storage instance.
// Phase 6: LocalFilesystemMediaStorageProvider only. On Railway without a
// persistent volume / object store, files under MEDIA_STORAGE_DIR are ephemeral
// and are lost on redeploy — production blocker for durable media.
export const mediaStorageProvider: MediaStorageProvider = new LocalFilesystemMediaStorageProvider();
