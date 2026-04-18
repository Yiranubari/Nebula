import multer from "multer";

// Store files in memory so we can stream them to Cloudinary without touching disk.
// NOTE: multer only inspects the client-supplied MIME type, which is trivially
// spoofable. We rely on Cloudinary's server-side content sniffing + resource_type
// to reject files whose actual contents don't match an allowed media type.
// If we ever store uploads locally, add magic-byte validation here (e.g. file-type).
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max per file
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      // Images
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
      // Videos
      "video/mp4",
      "video/webm",
      // Audio
      "audio/mpeg",
      "audio/webm",
      "audio/ogg",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});
