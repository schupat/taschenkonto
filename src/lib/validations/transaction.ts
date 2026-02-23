import { z } from "zod/v4";

export const createTransactionSchema = z.object({
  amountCents: z.number().int().positive("Amount must be positive").max(100_000_00),
  type: z.enum(["DEPOSIT", "WITHDRAWAL", "ADJUSTMENT"]),
  description: z.string().min(1).max(200),
});
