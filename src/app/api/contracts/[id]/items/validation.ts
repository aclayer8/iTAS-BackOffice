import { z } from "zod";

const nullableText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null).nullable();

const nullableDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  })
  .nullable();

export const ContractItemInputSchema = z.object({
  itemType: z.enum(["HARDWARE", "LICENSE", "SUBSCRIPTION", "SERVICE", "SUPPORT"]),
  partNumber: nullableText(100),
  description: nullableText(500),
  serialNumber: nullableText(100),
  quantity: z.number().int().positive().max(999999).nullable(),
  unit: nullableText(50),
  sla: nullableText(200),
  startDate: nullableDate,
  endDate: nullableDate,
  remark: nullableText(500),
  syncAsset: z.boolean().default(false),
});

export const ContractItemUpdateSchema = ContractItemInputSchema.extend({
  syncAsset: z.boolean().default(true),
  confirmSerialChange: z.boolean().default(false),
});

export function toDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function hasInvalidDateRange(startDate: Date | null, endDate: Date | null) {
  return Boolean(startDate && endDate && endDate < startDate);
}

export function contractItemAuditValues(item: {
  itemType: string;
  partNumber: string | null;
  description: string | null;
  serialNumber: string | null;
  quantity: number | null;
  unit: string | null;
  sla: string | null;
  startDate: Date | null;
  endDate: Date | null;
  remark: string | null;
  warrantyRef: string | null;
  sortOrder: number;
}) {
  return {
    itemType: item.itemType,
    partNumber: item.partNumber,
    description: item.description,
    serialNumber: item.serialNumber,
    quantity: item.quantity,
    unit: item.unit,
    sla: item.sla,
    startDate: item.startDate?.toISOString() ?? null,
    endDate: item.endDate?.toISOString() ?? null,
    remark: item.remark,
    warrantyRef: item.warrantyRef,
    sortOrder: item.sortOrder,
  };
}
