import { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, created, notFound, ok, serverError, withAuth, createAuditLog } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";
import { createLicenseUploadUrl, licenseObjectKey, validateLicenseFile, verifyLicenseObject } from "@/lib/s3";

const FileSchema = z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(150), fileSize: z.number().int().positive(), s3Key: z.string().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (request) => {
    try {
      const { id } = await params;
      const license = await prisma.license.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
      if (!license) return notFound("License");
      const parsed = FileSchema.omit({ s3Key: true }).safeParse(await request.json());
      if (!parsed.success) return badRequest("Invalid file metadata");
      const validationError = validateLicenseFile(parsed.data.fileName, parsed.data.mimeType, parsed.data.fileSize);
      if (validationError) return badRequest(validationError);
      const s3Key = licenseObjectKey(id, parsed.data.fileName);
      const signed = await createLicenseUploadUrl(s3Key, parsed.data.mimeType);
      const response = ok({ ...signed, s3Key, expiresIn: 300 });
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) { return serverError(error); }
  }, "license:write");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (request, userId) => {
    try {
      const { id } = await params;
      const parsed = FileSchema.required({ s3Key: true }).safeParse(await request.json());
      if (!parsed.success || !parsed.data.s3Key.startsWith(`licenses/${id}/`)) return badRequest("Invalid upload confirmation");
      const validationError = validateLicenseFile(parsed.data.fileName, parsed.data.mimeType, parsed.data.fileSize);
      if (validationError) return badRequest(validationError);
      const license = await prisma.license.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
      if (!license) return notFound("License");
      const object = await verifyLicenseObject(parsed.data.s3Key);
      if (object.fileSize !== parsed.data.fileSize || object.mimeType !== parsed.data.mimeType) return badRequest("Uploaded object does not match expected metadata");
      const attachment = await prisma.licenseAttachment.create({ data: { licenseId: id, fileName: parsed.data.fileName, fileSize: parsed.data.fileSize, mimeType: parsed.data.mimeType, s3Key: parsed.data.s3Key, s3Bucket: object.bucket, uploadedById: userId } });
      await createAuditLog({ userId, action: "CREATE", entityType: "license_attachment", entityId: attachment.id, newValues: { licenseId: id, fileName: attachment.fileName, fileSize: attachment.fileSize }, description: "Uploaded license attachment", req: request });
      return created(attachment);
    } catch (error) { return serverError(error); }
  }, "license:write");
}
