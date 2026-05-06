-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALE', 'ENGINEER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_RENEWAL');

-- CreateEnum
CREATE TYPE "SlaType" AS ENUM ('ONSITE_NBD', 'ONSITE_4HR', 'REMOTE_NBD', 'REMOTE_4HR', 'BEST_EFFORT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SupportType" AS ENUM ('BUSINESS_HOURS', 'EXTENDED', 'TWENTYFOUR_SEVEN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('HARDWARE', 'LICENSE', 'SUBSCRIPTION', 'SERVICE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('FIREWALL', 'SWITCH', 'WIRELESS_AP', 'SERVER', 'STORAGE', 'UPS', 'ROUTER', 'LOAD_BALANCER', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetLifecycleStatus" AS ENUM ('ACTIVE', 'WARRANTY_EXPIRED', 'EOS', 'EOL', 'DECOMMISSIONED', 'IN_STORAGE', 'REPLACED');

-- CreateEnum
CREATE TYPE "AssetHistoryEvent" AS ENUM ('INSTALLED', 'REPLACED', 'RMA_SENT', 'RMA_RECEIVED', 'RELOCATED', 'FIRMWARE_UPGRADED', 'CONFIGURATION_CHANGED', 'DECOMMISSIONED', 'RENEWED', 'NOTED');

-- CreateEnum
CREATE TYPE "LicenseRenewalStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttachmentEntityType" AS ENUM ('CUSTOMER', 'CONTRACT', 'ASSET', 'LICENSE', 'RENEWAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'LOGIN', 'LOGOUT', 'BULK_IMPORT', 'GENERATE_CERTIFICATE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WARRANTY_EXPIRING', 'CONTRACT_EXPIRING', 'LICENSE_EXPIRING', 'RENEWAL_DUE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatar_url" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "country" TEXT,
    "website" TEXT,
    "support_portal" TEXT,
    "support_email" TEXT,
    "support_phone" TEXT,
    "contact_person" TEXT,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "short_name" TEXT,
    "tax_id" TEXT,
    "address" TEXT,
    "billing_address" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "tier" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_sites" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "address" TEXT,
    "district" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Thailand',
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "is_head_office" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contract_no" TEXT NOT NULL,
    "so_no" TEXT,
    "po_no" TEXT,
    "quotation_no" TEXT,
    "customer_id" TEXT NOT NULL,
    "site_id" TEXT,
    "vendor_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "service_description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "sla_type" "SlaType" NOT NULL DEFAULT 'ONSITE_NBD',
    "support_type" "SupportType" NOT NULL DEFAULT 'BUSINESS_HOURS',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "total_value" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "remark" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_id" TEXT,
    "is_renewal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_items" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "item_type" "ItemType" NOT NULL,
    "part_number" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "description" TEXT,
    "serial_number" TEXT,
    "quantity" INTEGER,
    "unit" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "sla" TEXT,
    "vendor_support" TEXT,
    "warranty_ref" TEXT,
    "unit_price" DECIMAL(15,2),
    "total_price" DECIMAL(15,2),
    "remark" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_renewals" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "renewal_no" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "renewal_value" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "so_no" TEXT,
    "po_no" TEXT,
    "quotation_no" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "sent_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contract_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "asset_code" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serial_number" TEXT,
    "asset_type" "AssetType" NOT NULL,
    "customer_id" TEXT NOT NULL,
    "site_id" TEXT,
    "engineer_owner_id" TEXT,
    "install_date" TIMESTAMP(3),
    "warranty_start" TIMESTAMP(3),
    "warranty_end" TIMESTAMP(3),
    "vendor_id" TEXT,
    "part_number" TEXT,
    "lifecycle_status" "AssetLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "rack_location" TEXT,
    "ip_address" TEXT,
    "mac_address" TEXT,
    "firmware_version" TEXT,
    "os_version" TEXT,
    "purchase_price" DECIMAL(15,2),
    "purchase_date" TIMESTAMP(3),
    "po_number" TEXT,
    "note" TEXT,
    "qr_code_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_histories" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "event" "AssetHistoryEvent" NOT NULL,
    "description" TEXT NOT NULL,
    "performed_by" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ticket_ref" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "license_name" TEXT NOT NULL,
    "license_key" TEXT,
    "vendor" TEXT,
    "vendor_id" TEXT,
    "product" TEXT,
    "edition" TEXT,
    "quantity" INTEGER,
    "unit" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "assigned_customer_id" TEXT,
    "assigned_site_id" TEXT,
    "renewal_status" "LicenseRenewalStatus" NOT NULL DEFAULT 'ACTIVE',
    "po_number" TEXT,
    "purchase_price" DECIMAL(15,2),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "entity_type" "AttachmentEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_bucket" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "days_until" INTEGER,
    "read_at" TIMESTAMP(3),
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_tags" (
    "asset_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "asset_tags_pkey" PRIMARY KEY ("asset_id","tag_id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "customer_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("customer_id","tag_id")
);

-- CreateTable
CREATE TABLE "contract_sequences" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contract_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_sequences" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "renewal_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_sequences" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "asset_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "vendors"("name");

-- CreateIndex
CREATE INDEX "vendors_is_active_idx" ON "vendors"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tax_id_key" ON "customers"("tax_id");

-- CreateIndex
CREATE INDEX "customers_company_name_idx" ON "customers"("company_name");

-- CreateIndex
CREATE INDEX "customers_tax_id_idx" ON "customers"("tax_id");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE INDEX "customer_sites_customer_id_idx" ON "customer_sites"("customer_id");

-- CreateIndex
CREATE INDEX "customer_sites_province_idx" ON "customer_sites"("province");

-- CreateIndex
CREATE INDEX "customer_sites_deleted_at_idx" ON "customer_sites"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_no_key" ON "contracts"("contract_no");

-- CreateIndex
CREATE INDEX "contracts_contract_no_idx" ON "contracts"("contract_no");

-- CreateIndex
CREATE INDEX "contracts_customer_id_idx" ON "contracts"("customer_id");

-- CreateIndex
CREATE INDEX "contracts_site_id_idx" ON "contracts"("site_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_start_date_idx" ON "contracts"("start_date");

-- CreateIndex
CREATE INDEX "contracts_end_date_idx" ON "contracts"("end_date");

-- CreateIndex
CREATE INDEX "contracts_so_no_idx" ON "contracts"("so_no");

-- CreateIndex
CREATE INDEX "contracts_po_no_idx" ON "contracts"("po_no");

-- CreateIndex
CREATE INDEX "contracts_deleted_at_idx" ON "contracts"("deleted_at");

-- CreateIndex
CREATE INDEX "contract_items_contract_id_idx" ON "contract_items"("contract_id");

-- CreateIndex
CREATE INDEX "contract_items_serial_number_idx" ON "contract_items"("serial_number");

-- CreateIndex
CREATE INDEX "contract_items_part_number_idx" ON "contract_items"("part_number");

-- CreateIndex
CREATE INDEX "contract_items_item_type_idx" ON "contract_items"("item_type");

-- CreateIndex
CREATE UNIQUE INDEX "contract_renewals_renewal_no_key" ON "contract_renewals"("renewal_no");

-- CreateIndex
CREATE INDEX "contract_renewals_contract_id_idx" ON "contract_renewals"("contract_id");

-- CreateIndex
CREATE INDEX "contract_renewals_status_idx" ON "contract_renewals"("status");

-- CreateIndex
CREATE INDEX "contract_renewals_end_date_idx" ON "contract_renewals"("end_date");

-- CreateIndex
CREATE INDEX "contract_renewals_deleted_at_idx" ON "contract_renewals"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_code_key" ON "assets"("asset_code");

-- CreateIndex
CREATE INDEX "assets_asset_code_idx" ON "assets"("asset_code");

-- CreateIndex
CREATE INDEX "assets_serial_number_idx" ON "assets"("serial_number");

-- CreateIndex
CREATE INDEX "assets_customer_id_idx" ON "assets"("customer_id");

-- CreateIndex
CREATE INDEX "assets_site_id_idx" ON "assets"("site_id");

-- CreateIndex
CREATE INDEX "assets_asset_type_idx" ON "assets"("asset_type");

-- CreateIndex
CREATE INDEX "assets_lifecycle_status_idx" ON "assets"("lifecycle_status");

-- CreateIndex
CREATE INDEX "assets_warranty_end_idx" ON "assets"("warranty_end");

-- CreateIndex
CREATE INDEX "assets_deleted_at_idx" ON "assets"("deleted_at");

-- CreateIndex
CREATE INDEX "asset_histories_asset_id_idx" ON "asset_histories"("asset_id");

-- CreateIndex
CREATE INDEX "asset_histories_event_idx" ON "asset_histories"("event");

-- CreateIndex
CREATE INDEX "asset_histories_event_date_idx" ON "asset_histories"("event_date");

-- CreateIndex
CREATE INDEX "licenses_assigned_customer_id_idx" ON "licenses"("assigned_customer_id");

-- CreateIndex
CREATE INDEX "licenses_end_date_idx" ON "licenses"("end_date");

-- CreateIndex
CREATE INDEX "licenses_renewal_status_idx" ON "licenses"("renewal_status");

-- CreateIndex
CREATE INDEX "licenses_deleted_at_idx" ON "licenses"("deleted_at");

-- CreateIndex
CREATE INDEX "attachments_entity_type_entity_id_idx" ON "attachments"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "attachments_uploaded_by_id_idx" ON "attachments"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- AddForeignKey
ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "customer_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_renewals" ADD CONSTRAINT "contract_renewals_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_renewals" ADD CONSTRAINT "contract_renewals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "customer_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_engineer_owner_id_fkey" FOREIGN KEY ("engineer_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_histories" ADD CONSTRAINT "asset_histories_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_assigned_customer_id_fkey" FOREIGN KEY ("assigned_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_assigned_site_id_fkey" FOREIGN KEY ("assigned_site_id") REFERENCES "customer_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachment_customer_fk" FOREIGN KEY ("entity_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachment_contract_fk" FOREIGN KEY ("entity_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachment_asset_fk" FOREIGN KEY ("entity_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachment_license_fk" FOREIGN KEY ("entity_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachment_renewal_fk" FOREIGN KEY ("entity_id") REFERENCES "contract_renewals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_customer_fk" FOREIGN KEY ("entity_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_contract_fk" FOREIGN KEY ("entity_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_asset_fk" FOREIGN KEY ("entity_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
