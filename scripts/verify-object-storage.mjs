import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";

nextEnv.loadEnvConfig(process.cwd());

const bucket = process.env.S3_BUCKET_NAME || "itas-license-files";
const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.S3_ENDPOINT;
const region = process.env.NEON_STORAGE_REGION || process.env.AWS_REGION || process.env.S3_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;

if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
  throw new Error("Object storage environment is incomplete");
}

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});
const key = `_healthchecks/${randomUUID()}.txt`;
const expected = "iTAS Neon Object Storage verification";

try {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: expected,
    ContentType: "text/plain",
  }));
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const actual = await result.Body?.transformToString();
  if (actual !== expected) throw new Error("Object content verification failed");
  console.log(`Object storage verification passed for private bucket ${bucket}`);
} finally {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
