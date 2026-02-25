import { z } from "zod";

export const clientCreateInputSchema = z.object({
  fio: z.string().trim().min(1, "fio required").max(255),
  address: z.string().trim().max(500).optional().default("")
});

export const clientUpdateInputSchema = z.object({
  id: z.number().int().positive(),
  fio: z.string().trim().min(1).max(255),
  address: z.string().trim().max(500).optional().default("")
});

export const clientGetInputSchema = z.object({
  id: z.number().int().positive()
});

export const clientListInputSchema = z.object({
  search: z.string().trim().max(255).optional().default("")
});
