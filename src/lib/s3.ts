import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

export const LICENSE_FILE_TYPES = new Map([
  ["application/pdf", ["pdf"]],
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
  ["image/gif", ["gif"]],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ["docx"]],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ["xlsx"]],
  ["application/msword", ["doc"]],
  ["application/vnd.ms-excel", ["xls"]],
] as const);

function config() {
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET_NAME;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!region || !bucket || !accessKeyId || !secretAccessKey) throw new Error("S3 storage is not configured");
  return { region, bucket, accessKeyId, secretAccessKey, endpoint: process.env.S3_ENDPOINT };
}

function client() {
  const value = config();
  return new S3Client({
    region: value.region,
    endpoint: value.endpoint || undefined,
    forcePathStyle: Boolean(value.endpoint),
    credentials: { accessKeyId: value.accessKeyId, secretAccessKey: value.secretAccessKey },
  });
}

export function maxLicenseFileSize() {
  const configured = Number(process.env.MAX_FILE_SIZE_MB ?? "25");
  return Math.min(Number.isFinite(configured) && configured > 0 ? configured : 25, 25) * 1024 * 1024;
}

export function validateLicenseFile(fileName: string, mimeType: string, fileSize: number) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const extensions = LICENSE_FILE_TYPES.get(mimeType as never) as readonly string[] | undefined;
  if (!extensions?.includes(extension)) return "Unsupported file type";
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > maxLicenseFileSize()) return "Invalid file size";
  return null;
}

export function licenseObjectKey(licenseId: string, fileName: string) {
  const safeName = fileName.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/\.{2,}/g, ".").replace(/^[.-]+/, "").slice(-120) || "file";
  return `licenses/${licenseId}/${randomUUID()}-${safeName}`;
}

export async function createLicenseUploadUrl(key: string, mimeType: string) {
  const { bucket } = config();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType });
  return { bucket, uploadUrl: await getSignedUrl(client(), command, { expiresIn: 300 }) };
}

export async function verifyLicenseObject(key: string) {
  const { bucket } = config();
  const result = await client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return { bucket, fileSize: result.ContentLength, mimeType: result.ContentType };
}

export async function createLicensePreviewUrl(key: string, fileName: string, mimeType: string) {
  const { bucket } = config();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: mimeType,
    ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  });
  return getSignedUrl(client(), command, { expiresIn: 300 });
}
