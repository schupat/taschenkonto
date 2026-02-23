import { z } from "zod/v4";

export const createChoreSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  rewardCents: z.number().int().positive().max(100_000_00),
  recurrence: z.enum(["ONE_TIME", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
});

export const updateChoreSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  rewardCents: z.number().int().positive().optional(),
});

export const assignChoreSchema = z.object({
  childAccountId: z.string().min(1),
});
