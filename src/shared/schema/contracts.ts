import { z } from "zod";

export const contractStatusSchema = z.enum([
  "draft",
  "formed",
  "printed",
  "in_progress",
  "done"
]);

export const contractCreateInputSchema = z.object({
  clientId: z.number().int().positive(),
  contractNumber: z.string().trim().min(1).max(120),
  amount: z.number().finite().nonnegative()
});

export const contractUpdateStatusInputSchema = z.object({
  id: z.number().int().positive(),
  status: contractStatusSchema
});

export const contractGetInputSchema = z.object({
  id: z.number().int().positive()
});

export const contractListInputSchema = z.object({
  search: z.string().trim().max(255).optional().default(""),
  status: contractStatusSchema.optional()
});
