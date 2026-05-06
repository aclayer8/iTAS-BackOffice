// =============================================================
// iTAS BackOffice — Zod Validation Schemas
// Used in both API routes and React Hook Form
// =============================================================

import { z } from "zod";

// ---- Customer ----

export const CustomerSchema = z.object({
  companyName:    z.string().min(2, "Company name required").max(200),
  shortName:      z.string().max(50).optional().nullable(),
  taxId:          z.string().regex(/^\d{13}$/, "Tax ID must be 13 digits").optional().nullable(),
  address:        z.string().max(500).optional().nullable(),
  billingAddress: z.string().max(500).optional().nullable(),
  contactPerson:  z.string().max(100).optional().nullable(),
  contactPhone:   z.string().max(20).optional().nullable(),
  contactEmail:   z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  website:        z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  industry:       z.string().max(100).optional().nullable(),
  status:         z.enum(["ACTIVE", "INACTIVE", "PROSPECT", "BLACKLISTED"]).default("ACTIVE"),
  tier:           z.string().optional().nullable(),
  note:           z.string().max(2000).optional().nullable(),
});

export type CustomerInput = z.infer<typeof CustomerSchema>;

// ---- Customer Site ----

export const CustomerSiteSchema = z.object({
  customerId:     z.string().cuid("Invalid customer ID"),
  siteName:       z.string().min(2, "Site name required").max(200),
  address:        z.string().max(500).optional().nullable(),
  district:       z.string().max(100).optional().nullable(),
  province:       z.string().max(100).optional().nullable(),
  postalCode:     z.string().max(10).optional().nullable(),
  country:        z.string().default("Thailand"),
  contactPerson:  z.string().max(100).optional().nullable(),
  contactPhone:   z.string().max(20).optional().nullable(),
  contactEmail:   z.string().email().optional().nullable().or(z.literal("")),
  isHeadOffice:   z.boolean().default(false),
  note:           z.string().max(1000).optional().nullable(),
});

export type CustomerSiteInput = z.infer<typeof CustomerSiteSchema>;

// ---- Contract ----

export const ContractSchema = z.object({
  soNo:         z.string().max(100).optional().nullable(),
  poNo:         z.string().max(100).optional().nullable(),
  quotationNo:  z.string().max(100).optional().nullable(),
  customerId:   z.string().cuid("Invalid customer"),
  siteId:       z.string().cuid().optional().nullable(),
  vendorId:     z.string().cuid().optional().nullable(),
  serviceDesc:  z.string().max(1000).optional().nullable(),
  startDate:    z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate:      z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  slaType:      z.enum(["ONSITE_NBD", "ONSITE_4HR", "REMOTE_NBD", "REMOTE_4HR", "BEST_EFFORT", "CUSTOM"]),
  supportType:  z.enum(["BUSINESS_HOURS", "EXTENDED", "TWENTYFOUR_SEVEN", "CUSTOM"]),
  status:       z.enum(["DRAFT", "ACTIVE", "EXPIRED", "CANCELLED", "PENDING_RENEWAL"]).default("DRAFT"),
  autoRenew:    z.boolean().default(false),
  totalValue:   z.number().positive().optional().nullable(),
  currency:     z.string().default("THB"),
  remark:       z.string().max(2000).optional().nullable(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: "End date must be after start date", path: ["endDate"] }
);

export type ContractInput = z.infer<typeof ContractSchema>;

// ---- Contract Item ----

export const ContractItemSchema = z.object({
  itemType:     z.enum(["HARDWARE", "LICENSE", "SUBSCRIPTION", "SERVICE", "SUPPORT"]),
  partNumber:   z.string().max(100).optional().nullable(),
  brand:        z.string().max(100).optional().nullable(),
  model:        z.string().max(200).optional().nullable(),
  description:  z.string().max(500).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(), // NULLABLE — critical
  quantity:     z.number().int().positive().optional().nullable(),
  unit:         z.string().max(50).optional().nullable(),
  startDate:    z.string().optional().nullable(),
  endDate:      z.string().optional().nullable(),
  sla:          z.string().max(200).optional().nullable(),
  vendorSupport: z.string().max(200).optional().nullable(),
  unitPrice:    z.number().nonnegative().optional().nullable(),
  totalPrice:   z.number().nonnegative().optional().nullable(),
  remark:       z.string().max(500).optional().nullable(),
  sortOrder:    z.number().int().default(0),
});

export type ContractItemInput = z.infer<typeof ContractItemSchema>;

// ---- Asset ----

export const AssetSchema = z.object({
  brand:           z.string().min(1, "Brand required").max(100),
  model:           z.string().min(1, "Model required").max(200),
  serialNumber:    z.string().max(100).optional().nullable(), // OPTIONAL
  assetType:       z.enum(["FIREWALL", "SWITCH", "WIRELESS_AP", "SERVER", "STORAGE", "UPS", "ROUTER", "LOAD_BALANCER", "OTHER"]),
  customerId:      z.string().cuid("Invalid customer"),
  siteId:          z.string().cuid().optional().nullable(),
  engineerOwnerId: z.string().cuid().optional().nullable(),
  installDate:     z.string().optional().nullable(),
  warrantyStart:   z.string().optional().nullable(),
  warrantyEnd:     z.string().optional().nullable(),
  vendorId:        z.string().cuid().optional().nullable(),
  partNumber:      z.string().max(100).optional().nullable(),
  lifecycleStatus: z.enum(["ACTIVE", "WARRANTY_EXPIRED", "EOS", "EOL", "DECOMMISSIONED", "IN_STORAGE", "REPLACED"]).default("ACTIVE"),
  rackLocation:    z.string().max(100).optional().nullable(),
  ipAddress:       z.string().ip({ version: "v4" }).optional().nullable().or(z.literal("")),
  macAddress:      z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional().nullable().or(z.literal("")),
  firmwareVersion: z.string().max(100).optional().nullable(),
  osVersion:       z.string().max(100).optional().nullable(),
  purchasePrice:   z.number().nonnegative().optional().nullable(),
  purchaseDate:    z.string().optional().nullable(),
  poNumber:        z.string().max(100).optional().nullable(),
  note:            z.string().max(2000).optional().nullable(),
});

export type AssetInput = z.infer<typeof AssetSchema>;

// ---- License ----

export const LicenseSchema = z.object({
  licenseName:   z.string().min(2, "License name required").max(200),
  licenseKey:    z.string().max(500).optional().nullable(),
  vendor:        z.string().max(100).optional().nullable(),
  vendorId:      z.string().cuid().optional().nullable(),
  product:       z.string().max(100).optional().nullable(),
  edition:       z.string().max(100).optional().nullable(),
  quantity:      z.number().int().positive().optional().nullable(),
  unit:          z.string().max(50).optional().nullable(),
  startDate:     z.string().optional().nullable(),
  endDate:       z.string().optional().nullable(),
  customerId:    z.string().cuid().optional().nullable(),
  siteId:        z.string().cuid().optional().nullable(),
  renewalStatus: z.enum(["ACTIVE", "EXPIRING_SOON", "EXPIRED", "RENEWED", "CANCELLED"]).default("ACTIVE"),
  poNumber:      z.string().max(100).optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  note:          z.string().max(2000).optional().nullable(),
});

export type LicenseInput = z.infer<typeof LicenseSchema>;

// ---- Asset History ----

export const AssetHistorySchema = z.object({
  event:       z.enum(["INSTALLED", "REPLACED", "RMA_SENT", "RMA_RECEIVED", "RELOCATED", "FIRMWARE_UPGRADED", "CONFIGURATION_CHANGED", "DECOMMISSIONED", "RENEWED", "NOTED"]),
  description: z.string().min(1, "Description required").max(500),
  performedBy: z.string().max(100).optional().nullable(),
  eventDate:   z.string(),
  ticketRef:   z.string().max(100).optional().nullable(),
  note:        z.string().max(1000).optional().nullable(),
});

export type AssetHistoryInput = z.infer<typeof AssetHistorySchema>;

// ---- User ----

export const CreateUserSchema = z.object({
  email:      z.string().email("Invalid email"),
  name:       z.string().min(2, "Name required").max(100),
  password:   z.string().min(8, "Min 8 characters").max(100),
  role:       z.enum(["ADMIN", "SALE", "ENGINEER", "VIEWER"]),
  department: z.string().max(100).optional().nullable(),
  phone:      z.string().max(20).optional().nullable(),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true }).extend({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

// ---- Search ----

export const GlobalSearchSchema = z.object({
  q: z.string().min(2, "Search term must be at least 2 characters").max(100),
});

// ---- Pagination ----

export const PaginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort:  z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});
