import { z } from "zod";

const numericIdString = z.string().trim().regex(/^[1-9]\d*$/);

export const caseEnsureInputSchema = z.object({
  contractId: z.number().int().positive()
});

export const caseOpenFolderInputSchema = z.object({
  contractId: numericIdString
});

export const docGenerateInputSchema = z.object({
  contractId: z.number().int().positive()
});

export const convertToPdfInputSchema = z.object({
  sourceAbsolutePath: z.string().min(1),
  contractId: z.number().int().positive().optional()
});

export const pdfMergeInputSchema = z.object({
  contractId: numericIdString,
  fileIds: z.array(numericIdString).min(2),
  outputName: z.string().trim().min(1).max(255).optional()
});

export const fileImportInputSchema = z.object({
  contractId: z.number().int().positive(),
  sourceAbsolutePath: z.string().min(1),
  kind: z.string().trim().min(1).max(64).default("import")
});

export const filesListByContractInputSchema = z.object({
  contractId: numericIdString
});

export const envDiagnosticsInputSchema = z.object({});
