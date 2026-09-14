import type { LucideIcon } from "lucide-react";
import { Boxes, Headphones, Settings, ShieldCheck } from "lucide-react";

export type ModuleStatus = "available" | "planned" | "reserved";

export type BackofficeModule = {
  id: string;
  slot: number;
  name: string;
  description: string;
  status: ModuleStatus;
  href?: string;
  icon: LucideIcon;
  color: "red" | "blue" | "gray";
};

export const BACKOFFICE_MODULES: BackofficeModule[] = [
  {
    id: "asset-management",
    slot: 1,
    name: "Asset Management",
    description: "Manage assets, maintenance contracts, customers, licenses, renewals, and reports.",
    status: "available",
    href: "/dashboard",
    icon: Boxes,
    color: "red",
  },
  {
    id: "ticket-management",
    slot: 2,
    name: "Ticket Management",
    description: "A dedicated service desk workspace. The module is reserved and ready for future implementation.",
    status: "planned",
    icon: Headphones,
    color: "blue",
  },
  ...Array.from({ length: 4 }, (_, index): BackofficeModule => ({
    id: `reserved-${index + 3}`,
    slot: index + 3,
    name: "Available space",
    description: "Reserved for a future iTAS BackOffice workflow.",
    status: "reserved",
    icon: index % 2 === 0 ? Settings : ShieldCheck,
    color: "gray",
  })),
];
