import { Router } from "express";
import { protect } from "../auth/auth.middleware";
import { upload } from "./uploads.multer";
import { uploadFile } from "./uploads.controller";

const router = Router();

/**
 * POST /api/uploads
 * Auth required. Multipart form-data, field name: "file"
 * Returns: { url, publicId, format, bytes, name, type }
 */
router.post(
  "/",
  protect,
  upload.single("file"),
  uploadFile
);

export default router;
