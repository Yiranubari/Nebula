import { api } from "./api";

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  name: string;
  type: string;
}

async function upload(file: File | Blob, name?: string): Promise<UploadResult> {
  const form = new FormData();
  const fileName =
    name ||
    (file instanceof File ? file.name : `upload-${Date.now()}`);
  form.append("file", file, fileName);

  const res = await api.post<UploadResult>("/uploads", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 120_000,
  });
  return res.data;
}

export const uploadsService = { upload };
