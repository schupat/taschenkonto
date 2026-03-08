import { z } from "zod/v4";

function validateScheduleFields(
  data: {
    frequency?: "WEEKLY" | "MONTHLY";
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
  },
  ctx: z.RefinementCtx
) {
  if (data.frequency === "WEEKLY") {
    if (data.dayOfWeek === undefined || data.dayOfWeek === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayOfWeek"],
        message: "dayOfWeek is required for weekly allowance rules",
      });
    }
    if (data.dayOfMonth !== undefined && data.dayOfMonth !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayOfMonth"],
        message: "dayOfMonth is not allowed for weekly allowance rules",
      });
    }
  }

  if (data.frequency === "MONTHLY") {
    if (data.dayOfMonth === undefined || data.dayOfMonth === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayOfMonth"],
        message: "dayOfMonth is required for monthly allowance rules",
      });
    }
    if (data.dayOfWeek !== undefined && data.dayOfWeek !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayOfWeek"],
        message: "dayOfWeek is not allowed for monthly allowance rules",
      });
    }
  }
}

export const createAllowanceRuleSchema = z
  .object({
    amountCents: z.number().int().positive().max(100_000_00),
    frequency: z.enum(["WEEKLY", "MONTHLY"]),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
  })
  .superRefine(validateScheduleFields);

export const updateAllowanceRuleSchema = z
  .object({
    amountCents: z.number().int().positive().max(100_000_00).optional(),
    isActive: z.boolean().optional(),
    frequency: z.enum(["WEEKLY", "MONTHLY"]).optional(),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const updatesSchedule =
      data.frequency !== undefined ||
      data.dayOfWeek !== undefined ||
      data.dayOfMonth !== undefined;

    if (!updatesSchedule) {
      return;
    }

    if (!data.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["frequency"],
        message: "frequency is required when updating the allowance schedule",
      });
      return;
    }

    validateScheduleFields(data, ctx);
  });
