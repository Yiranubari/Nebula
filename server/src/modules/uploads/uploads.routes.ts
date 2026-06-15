import { Router } from "express";
import { protect } from "../auth/auth.middleware";
import { upload } from "./uploads.multer";
import { uploadFile } from "./uploads.controller";

const router = Router();

router.post(
  "/",
  protect,
  upload.single("file"),
  uploadFile
);

export default router;
