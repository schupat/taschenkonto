import { z } from "zod/v4";

export const investmentTypeSchema = z.enum(["TAGESGELD", "FESTGELD"]);
export const investmentStatusSchema = z.enum(["ACTIVE", "MATURED", "WITHDRAWN"]);

export const createInvestmentSchema = z
  .object({
    type: investmentTypeSchema,
    amountCents: z.number().int().positive("Amount must be positive").max(100_000_00),
    interestRateBps: z.number().int().min(0).max(10000), // 0% to 100%
    termMonths: z.number().int().min(1).max(120).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "FESTGELD" && !data.termMonths) return false;
      if (data.type === "TAGESGELD" && data.termMonths) return false;
      return true;
    },
    {
      message:
        "Festgeld requires termMonths; Tagesgeld must not have termMonths",
    }
  );

export type InvestmentType = z.infer<typeof investmentTypeSchema>;
export type InvestmentStatus = z.infer<typeof investmentStatusSchema>;
export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
