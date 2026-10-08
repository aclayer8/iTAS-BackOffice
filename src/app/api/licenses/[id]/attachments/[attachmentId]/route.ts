import { NextRequest } from "next/server";
import { notFound, ok, serverError, withAuth } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";
import { createLicenseFileUrl } from "@/lib/s3";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  return withAuth(req, async () => {
    try {
      const { id, attachmentId } = await params;
      const attachment = await prisma.licenseAttachment.findFirst({ where: { id: attachmentId, licenseId: id } });
      if (!attachment) return notFound("Attachment");
      const disposition = req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
      const url = await createLicenseFileUrl(attachment.s3Key, attachment.fileName, attachment.mimeType, disposition);
      const response = ok({ url, expiresIn: 300 });
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) { return serverError(error); }
  }, "license:read");
}
