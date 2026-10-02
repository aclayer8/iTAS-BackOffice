ALTER TABLE "licenses" ADD COLUMN "contract_id" TEXT;

CREATE TABLE "license_attachments" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_bucket" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "license_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "licenses_contract_id_idx" ON "licenses"("contract_id");
CREATE UNIQUE INDEX "license_attachments_s3_key_key" ON "license_attachments"("s3_key");
CREATE INDEX "license_attachments_license_id_idx" ON "license_attachments"("license_id");
CREATE INDEX "license_attachments_uploaded_by_id_idx" ON "license_attachments"("uploaded_by_id");

ALTER TABLE "licenses" ADD CONSTRAINT "licenses_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "license_attachments" ADD CONSTRAINT "license_attachments_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
