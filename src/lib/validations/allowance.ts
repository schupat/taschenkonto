import { z } from "zod/v4";

export const createAllowanceRuleSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_00),
  frequency: z.enum(["WEEKLY", "MONTHLY"]),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
});

export const updateAllowanceRuleSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_00).optional(),
  isActive: z.boolean().optional(),
});
