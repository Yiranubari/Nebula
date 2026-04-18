import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const defaultFolder = `nebula-${env.NODE_ENV}`;

/** Upload a buffer from multer's memory storage to Cloudinary */
export const uploadToCloudinary = (
  buffer: Buffer,
  mimetype: string,
  folder: string = defaultFolder
): Promise<{ url: string; publicId: string; format: string; bytes: number }> => {
  return new Promise((resolve, reject) => {
    const resourceType =
      mimetype.startsWith("video/") ? "video" :
      mimetype.startsWith("image/") ? "image" : "raw";

    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    stream.end(buffer);
  });
};
