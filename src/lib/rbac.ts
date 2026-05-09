// =============================================================
// iTAS BackOffice — Role-Based Access Control (RBAC)
// =============================================================

import type { Permission, UserRole } from "@/types";

// ---- Permission Matrix ----

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "customer:read", "customer:write", "customer:delete",
    "contract:read", "contract:write", "contract:delete", "contract:export",
    "asset:read", "asset:write", "asset:delete",
    "license:read", "license:write", "license:delete",
    "renewal:read", "renewal:write",
    "report:read", "report:export",
    "user:read", "user:write", "user:delete",
    "audit:read",
    "settings:read", "settings:write",
    "certificate:generate",
  ],

  SALE: [
    "customer:read", "customer:write",
    "contract:read", "contract:write", "contract:export",
    "asset:read",
    "license:read",
    "renewal:read", "renewal:write",
    "report:read", "report:export",
    "certificate:generate",
  ],

  ENGINEER: [
    "customer:read",
    "contract:read",
    "asset:read", "asset:write",
    "license:read",
    "renewal:read",
    "report:read",
    "certificate:generate",
  ],

  VIEWER: [
    "customer:read",
    "contract:read",
    "asset:read",
    "license:read",
    "renewal:read",
    "report:read",
  ],
};

// ---- Permission Checker ----

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getUserPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ---- Route-level Guards ----

export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  "/dashboard":            [],                                          // All authenticated
  "/customers":            ["customer:read"],
  "/customers/new":        ["customer:write"],
  "/contracts":            ["contract:read"],
  "/contracts/new":        ["contract:write"],
  "/renewals":             ["renewal:read"],
  "/renewals/new":         ["renewal:write"],
  "/assets":               ["asset:read"],
  "/assets/new":           ["asset:write"],
  "/licenses":             ["license:read"],
  "/licenses/new":         ["license:write"],
  "/reports":              ["report:read"],
  "/settings":             ["settings:read"],
  "/settings/users":       ["user:read"],
  "/audit-logs":           ["audit:read"],
};

export function canAccessRoute(role: UserRole, path: string): boolean {
  // Find the most specific matching route
  const routeKeys = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  const matchedRoute = routeKeys.find((route) => path.startsWith(route));

  if (!matchedRoute) return true; // No restriction defined
  const required = ROUTE_PERMISSIONS[matchedRoute];
  if (required.length === 0) return true; // All authenticated users
  return hasAnyPermission(role, required);
}

// ---- Role Labels ----

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  SALE: "Sales",
  ENGINEER: "Engineer",
  VIEWER: "Viewer",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: "bg-red-100 text-red-700",
  SALE: "bg-blue-100 text-blue-700",
  ENGINEER: "bg-green-100 text-green-700",
  VIEWER: "bg-gray-100 text-gray-700",
};

// ---- React Hook ----

import { useSession } from "next-auth/react";

type SessionUser = { role?: UserRole };

export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession();
  const role = (session?.user as SessionUser)?.role;
  if (!role) return false;
  return hasPermission(role, permission);
}

export function usePermissions(permissions: Permission[]): boolean {
  const { data: session } = useSession();
  const role = (session?.user as SessionUser)?.role;
  if (!role) return false;
  return hasAnyPermission(role, permissions);
}
