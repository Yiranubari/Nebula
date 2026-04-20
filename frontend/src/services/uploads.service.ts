import { api } from "./api";

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  name: string;
  type: string;
}

/**
 * Upload a file or blob (voice recording, image, etc.) to the server, which
 * forwards it to Cloudinary and returns the hosted URL.
 *
 * Using HTTP multipart upload — sending base64 `data:` URLs through
 * Socket.IO bumps into engine.io's ~1MB payload limit and silently drops
 * anything larger. This path has no such cap.
 */
async function upload(file: File | Blob, name?: string): Promise<UploadResult> {
  const form = new FormData();
  // `File` has its own name; plain `Blob` (voice recordings) needs one
  // supplied so multer has something to persist.
  const fileName =
    name ||
    (file instanceof File ? file.name : `upload-${Date.now()}`);
  form.append("file", file, fileName);

  const res = await api.post<UploadResult>("/uploads", form, {
    headers: {
      // Let the browser set the boundary; axios drops the default JSON header
      // when we override Content-Type to undefined.
      "Content-Type": "multipart/form-data",
    },
    // Uploads are bigger than normal requests — give them their own ceiling.
    timeout: 120_000,
  });
  return res.data;
}

export const uploadsService = { upload };
