import { z } from "zod";

export const envSchema = z.object({
  VITE_DEV_SERVER_URL: z.string().url().optional()
});
