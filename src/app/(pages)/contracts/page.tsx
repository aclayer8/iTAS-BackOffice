import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import type { UserRole } from "@/types";
import { contractListSelect, contractListWhere, parseContractListParams, prepareContractList, type ContractListParams } from "@/lib/contract-list";
import ContractsList from "./ContractsList";

export const dynamic = "force-dynamic";

export default async function ContractsPage({ searchParams }: { searchParams: Promise<ContractListParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role as UserRole;
  const filters = parseContractListParams(await searchParams);
  const now = new Date();
  const [records, customers] = await Promise.all([
    prisma.contract.findMany({ where: contractListWhere(filters, now), select: contractListSelect }),
    prisma.customer.findMany({ where: { contracts: { some: { deletedAt: null } } }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
  ]);
  const { matching: _matching, ...list } = prepareContractList(records, filters, now);
  return <ContractsList key={JSON.stringify(filters)} {...list} filters={{ ...filters, page: list.page }} customers={customers}
    canEdit={hasPermission(role, "contract:write")} canDelete={hasPermission(role, "contract:delete")} canExport={hasPermission(role, "contract:export")} />;
}
