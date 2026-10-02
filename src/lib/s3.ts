import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const DEFAULT_LICENSE_BUCKET = "itas-license-files";

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

export function resolveStorageConfig(env: NodeJS.ProcessEnv = process.env) {
  const endpoint = env.AWS_ENDPOINT_URL_S3 || env.S3_ENDPOINT;
  const region = env.NEON_STORAGE_REGION || env.AWS_REGION || env.S3_REGION;
  const bucket = env.S3_BUCKET_NAME || DEFAULT_LICENSE_BUCKET;
  const accessKeyId = env.AWS_ACCESS_KEY_ID || env.S3_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY || env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) throw new Error("Object storage is not configured");

  let parsedEndpoint: URL;
  try { parsedEndpoint = new URL(endpoint); }
  catch { throw new Error("Object storage endpoint is invalid"); }
  if (env.NODE_ENV === "production" && parsedEndpoint.protocol !== "https:") {
    throw new Error("Object storage endpoint must use HTTPS in production");
  }

  return { region, bucket, accessKeyId, secretAccessKey, endpoint: parsedEndpoint.toString() };
}

function client() {
  const value = resolveStorageConfig();
  return new S3Client({
    region: value.region,
    endpoint: value.endpoint || undefined,
    forcePathStyle: true,
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
  const { bucket } = resolveStorageConfig();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType });
  return { bucket, uploadUrl: await getSignedUrl(client(), command, { expiresIn: 300 }) };
}

export async function verifyLicenseObject(key: string) {
  const { bucket } = resolveStorageConfig();
  const result = await client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return { bucket, fileSize: result.ContentLength, mimeType: result.ContentType };
}

export async function createLicensePreviewUrl(key: string, fileName: string, mimeType: string) {
  const { bucket } = resolveStorageConfig();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: mimeType,
    ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  });
  return getSignedUrl(client(), command, { expiresIn: 300 });
}
