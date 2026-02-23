import { z } from "zod/v4";

export const createChildSchema = z.object({
  name: z.string().min(1).max(50),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
  avatarEmoji: z.string().max(10).optional(),
});

export const updateChildSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  avatarEmoji: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
