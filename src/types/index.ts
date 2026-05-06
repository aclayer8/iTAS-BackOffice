// =============================================================
// iTAS BackOffice — Core TypeScript Types
// =============================================================

// ---- Enums (mirror Prisma enums for client use) ----

export type UserRole = "ADMIN" | "SALE" | "ENGINEER" | "VIEWER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "PROSPECT" | "BLACKLISTED";
export type ContractStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING_RENEWAL";
export type SlaType = "ONSITE_NBD" | "ONSITE_4HR" | "REMOTE_NBD" | "REMOTE_4HR" | "BEST_EFFORT" | "CUSTOM";
export type SupportType = "BUSINESS_HOURS" | "EXTENDED" | "TWENTYFOUR_SEVEN" | "CUSTOM";
export type ItemType = "HARDWARE" | "LICENSE" | "SUBSCRIPTION" | "SERVICE" | "SUPPORT";
export type AssetType = "FIREWALL" | "SWITCH" | "WIRELESS_AP" | "SERVER" | "STORAGE" | "UPS" | "ROUTER" | "LOAD_BALANCER" | "OTHER";
export type AssetLifecycleStatus = "ACTIVE" | "WARRANTY_EXPIRED" | "EOS" | "EOL" | "DECOMMISSIONED" | "IN_STORAGE" | "REPLACED";
export type AssetHistoryEvent = "INSTALLED" | "REPLACED" | "RMA_SENT" | "RMA_RECEIVED" | "RELOCATED" | "FIRMWARE_UPGRADED" | "CONFIGURATION_CHANGED" | "DECOMMISSIONED" | "RENEWED" | "NOTED";
export type LicenseRenewalStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "RENEWED" | "CANCELLED";
export type NotificationType = "WARRANTY_EXPIRING" | "CONTRACT_EXPIRING" | "LICENSE_EXPIRING" | "RENEWAL_DUE" | "SYSTEM";
export type NotificationStatus = "UNREAD" | "READ" | "DISMISSED";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "EXPORT" | "LOGIN" | "LOGOUT" | "BULK_IMPORT" | "GENERATE_CERTIFICATE";

// ---- Base Entity ----

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ---- User ----

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
  phone?: string | null;
  department?: string | null;
  lastLoginAt?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// ---- Customer ----

export interface Customer extends BaseEntity {
  companyName: string;
  shortName?: string | null;
  taxId?: string | null;
  address?: string | null;
  billingAddress?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  industry?: string | null;
  status: CustomerStatus;
  tier?: string | null;
  note?: string | null;
  _count?: {
    sites: number;
    contracts: number;
    assets: number;
  };
}

export interface CustomerSite extends BaseEntity {
  customerId: string;
  siteName: string;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country: string;
  contactPerson?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  isHeadOffice: boolean;
  note?: string | null;
  customer?: Pick<Customer, "id" | "companyName" | "shortName">;
}

// ---- Vendor ----

export interface Vendor extends BaseEntity {
  name: string;
  shortName?: string | null;
  country?: string | null;
  website?: string | null;
  supportPortal?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  contactPerson?: string | null;
  note?: string | null;
  isActive: boolean;
}

// ---- Contract ----

export interface Contract extends BaseEntity {
  contractNo: string;
  soNo?: string | null;
  poNo?: string | null;
  quotationNo?: string | null;
  customerId: string;
  siteId?: string | null;
  vendorId?: string | null;
  createdById: string;
  serviceDesc?: string | null;
  startDate: string;
  endDate: string;
  slaType: SlaType;
  supportType: SupportType;
  status: ContractStatus;
  autoRenew: boolean;
  totalValue?: number | null;
  currency: string;
  remark?: string | null;
  version: number;
  parentId?: string | null;
  isRenewal: boolean;
  // Relations
  customer?: Pick<Customer, "id" | "companyName" | "shortName">;
  site?: Pick<CustomerSite, "id" | "siteName">;
  vendor?: Pick<Vendor, "id" | "name" | "shortName">;
  createdBy?: Pick<User, "id" | "name">;
  items?: ContractItem[];
  _count?: {
    items: number;
    renewals: number;
  };
}

export interface ContractItem {
  id: string;
  contractId: string;
  itemType: ItemType;
  partNumber?: string | null;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  serialNumber?: string | null;
  quantity?: number | null;
  unit?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sla?: string | null;
  vendorSupport?: string | null;
  warrantyRef?: string | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  remark?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContractRenewal extends BaseEntity {
  contractId: string;
  renewalNo: string;
  createdById: string;
  startDate: string;
  endDate: string;
  renewalValue?: number | null;
  currency: string;
  soNo?: string | null;
  poNo?: string | null;
  quotationNo?: string | null;
  status: ContractStatus;
  note?: string | null;
  sentAt?: string | null;
  approvedAt?: string | null;
  contract?: Pick<Contract, "id" | "contractNo">;
}

// ---- Asset ----

export interface Asset extends BaseEntity {
  assetCode: string;
  brand: string;
  model: string;
  serialNumber?: string | null;
  assetType: AssetType;
  customerId: string;
  siteId?: string | null;
  engineerOwnerId?: string | null;
  installDate?: string | null;
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  vendorId?: string | null;
  partNumber?: string | null;
  lifecycleStatus: AssetLifecycleStatus;
  rackLocation?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  firmwareVersion?: string | null;
  osVersion?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  poNumber?: string | null;
  note?: string | null;
  qrCodeUrl?: string | null;
  // Relations
  customer?: Pick<Customer, "id" | "companyName" | "shortName">;
  site?: Pick<CustomerSite, "id" | "siteName">;
  engineerOwner?: Pick<User, "id" | "name">;
  vendor?: Pick<Vendor, "id" | "name">;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  event: AssetHistoryEvent;
  description: string;
  performedBy?: string | null;
  eventDate: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ticketRef?: string | null;
  note?: string | null;
  createdAt: string;
}

// ---- License ----

export interface License extends BaseEntity {
  licenseName: string;
  licenseKey?: string | null;
  vendor?: string | null;
  vendorId?: string | null;
  product?: string | null;
  edition?: string | null;
  quantity?: number | null;
  unit?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  customerId?: string | null;
  siteId?: string | null;
  renewalStatus: LicenseRenewalStatus;
  poNumber?: string | null;
  purchasePrice?: number | null;
  note?: string | null;
  customer?: Pick<Customer, "id" | "companyName">;
  site?: Pick<CustomerSite, "id" | "siteName">;
}

// ---- Attachment ----

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  uploadedById: string;
  description?: string | null;
  createdAt: string;
  downloadUrl?: string;  // Pre-signed URL (runtime only)
}

// ---- Notification ----

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  daysUntil?: number | null;
  readAt?: string | null;
  emailSent: boolean;
  createdAt: string;
}

// ---- Dashboard ----

export interface DashboardStats {
  activeContracts: number;
  expiringContracts30d: number;
  expiringContracts60d: number;
  expiringContracts90d: number;
  expiringWarranty30d: number;
  totalAssets: number;
  totalCustomers: number;
  activeCustomers: number;
  expiringLicenses30d: number;
}

export interface ExpiryAlert {
  id: string;
  type: "CONTRACT" | "WARRANTY" | "LICENSE";
  entityId: string;
  entityName: string;
  customerName: string;
  endDate: string;
  daysRemaining: number;
}

// ---- API Responses ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Search ----

export interface GlobalSearchResult {
  type: "CONTRACT" | "ASSET" | "CUSTOMER" | "LICENSE";
  id: string;
  title: string;
  subtitle: string;
  url: string;
  meta?: string;
}

// ---- Forms ----

export type SortDirection = "asc" | "desc";

export interface TableFilter {
  field: string;
  value: string | string[] | boolean | null;
  operator?: "eq" | "contains" | "gte" | "lte" | "in";
}

export interface TableSort {
  field: string;
  direction: SortDirection;
}

export interface TablePagination {
  page: number;
  limit: number;
}

export interface TableQueryParams {
  filters?: TableFilter[];
  sort?: TableSort;
  pagination: TablePagination;
  search?: string;
}

// ---- Certificate Generator ----

export interface CertificateData {
  contractNo: string;
  contractDate: string;
  customer: {
    companyName: string;
    address: string;
    contactPerson: string;
    contactPhone: string;
  };
  site?: {
    siteName: string;
    address: string;
  };
  items: {
    no: number;
    description: string;
    model?: string;
    serialNumber?: string;
    quantity?: number;
    unit?: string;
    startDate: string;
    endDate: string;
    sla?: string;
  }[];
  slaType: SlaType;
  supportType: SupportType;
  startDate: string;
  endDate: string;
  signedBy?: string;
  signedDate?: string;
}

// ---- RBAC ----

export type Permission =
  | "customer:read" | "customer:write" | "customer:delete"
  | "contract:read" | "contract:write" | "contract:delete" | "contract:export"
  | "asset:read" | "asset:write" | "asset:delete"
  | "license:read" | "license:write" | "license:delete"
  | "renewal:read" | "renewal:write"
  | "report:read" | "report:export"
  | "user:read" | "user:write" | "user:delete"
  | "audit:read"
  | "settings:read" | "settings:write"
  | "certificate:generate";
