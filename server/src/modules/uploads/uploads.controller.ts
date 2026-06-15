import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { uploadToCloudinary } from "./uploads.cloudinary";

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, "No file provided");
  }

  const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);

  res.status(200).json({
    url: result.url,
    publicId: result.publicId,
    format: result.format,
    bytes: result.bytes,
    name: req.file.originalname,
    type: req.file.mimetype,
  });
});
