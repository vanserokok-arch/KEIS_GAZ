import { z } from "zod";
import {
  clientCreateInputSchema,
  clientGetInputSchema,
  clientListInputSchema,
  clientUpdateInputSchema
} from "./schema/clients";
import {
  contractCreateInputSchema,
  contractGetInputSchema,
  contractListInputSchema,
  contractStatusSchema,
  contractUpdateStatusInputSchema
} from "./schema/contracts";
import {
  caseEnsureInputSchema,
  caseOpenFolderInputSchema,
  convertToPdfInputSchema,
  docGenerateInputSchema,
  envDiagnosticsInputSchema,
  fileImportInputSchema,
  filesListByContractInputSchema,
  pdfMergeInputSchema
} from "./schema/files";
import type { RpcResult } from "./types";

export const uiNoticeErrorSchema = z.object({
  code: z.string(),
  title: z.string(),
  message: z.string(),
  details: z.string().optional(),
  action: z
    .object({
      label: z.string(),
      url: z.string().optional()
    })
    .optional()
});

export const clientSchema = z.object({
  id: z.number().int(),
  fio: z.string(),
  address: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const contractSchema = z.object({
  id: z.number().int(),
  clientId: z.number().int(),
  contractNumber: z.string(),
  amount: z.number(),
  status: contractStatusSchema,
  casePath: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const fileRecordSchema = z.object({
  id: z.number().int(),
  contractId: z.number().int(),
  kind: z.string(),
  displayName: z.string(),
  relativePath: z.string(),
  createdAt: z.string()
});

export const caseFileSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  displayName: z.string(),
  relPath: z.string(),
  ext: z.string(),
  size: z.number().int().nonnegative().optional(),
  createdAt: z.string(),
  kind: z.enum(["pdf", "docx", "other"])
});

export const envDiagnosticsSchema = z.object({
  hasLibreOffice: z.boolean(),
  libreOfficePath: z.string().nullable(),
  libreOfficeVersion: z.string().nullable(),
  baseCaseDir: z.string(),
  allowedDirs: z.array(z.string())
});

export const caseEnsureOutputSchema = z.object({
  contractId: z.number().int(),
  casePath: z.string(),
  subdirs: z.array(z.string()),
  manifestPath: z.string()
});

export const caseOpenFolderOutputSchema = z.object({
  opened: z.literal(true)
});

export const docGenerateOutputSchema = z.object({
  contractId: z.number().int(),
  outputPath: z.string(),
  fileRecordId: z.number().int().optional(),
  warning: uiNoticeErrorSchema.optional()
});

export const convertToPdfOutputSchema = z.object({
  converted: z.boolean(),
  outputPath: z.string().nullable(),
  warning: uiNoticeErrorSchema.optional()
});

export const pdfMergeOutputSchema = z.object({
  outputPath: z.string(),
  pageCount: z.number().int().nonnegative()
});

export const fileImportOutputSchema = z.object({
  file: fileRecordSchema
});

const rpcResult = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([
    z.object({ ok: z.literal(true), data: dataSchema }),
    z.object({ ok: z.literal(false), error: uiNoticeErrorSchema })
  ]);

export const ipcContract = {
  "clients:list": {
    input: clientListInputSchema,
    output: rpcResult(z.object({ items: z.array(clientSchema) }))
  },
  "clients:create": {
    input: clientCreateInputSchema,
    output: rpcResult(clientSchema)
  },
  "clients:update": {
    input: clientUpdateInputSchema,
    output: rpcResult(clientSchema)
  },
  "clients:get": {
    input: clientGetInputSchema,
    output: rpcResult(clientSchema)
  },
  "contracts:list": {
    input: contractListInputSchema,
    output: rpcResult(z.object({ items: z.array(contractSchema) }))
  },
  "contracts:create": {
    input: contractCreateInputSchema,
    output: rpcResult(contractSchema)
  },
  "contracts:updateStatus": {
    input: contractUpdateStatusInputSchema,
    output: rpcResult(contractSchema)
  },
  "contracts:get": {
    input: contractGetInputSchema,
    output: rpcResult(contractSchema)
  },
  "case:ensure": {
    input: caseEnsureInputSchema,
    output: rpcResult(caseEnsureOutputSchema)
  },
  "case:openFolder": {
    input: caseOpenFolderInputSchema,
    output: rpcResult(caseOpenFolderOutputSchema)
  },
  "documents:generateContractDocx": {
    input: docGenerateInputSchema,
    output: rpcResult(docGenerateOutputSchema)
  },
  "documents:generateActDocx": {
    input: docGenerateInputSchema,
    output: rpcResult(docGenerateOutputSchema)
  },
  "documents:convertToPdf": {
    input: convertToPdfInputSchema,
    output: rpcResult(convertToPdfOutputSchema)
  },
  "pdf:merge": {
    input: pdfMergeInputSchema,
    output: rpcResult(pdfMergeOutputSchema)
  },
  "files:importToCase": {
    input: fileImportInputSchema,
    output: rpcResult(fileImportOutputSchema)
  },
  "files:listByContract": {
    input: filesListByContractInputSchema,
    output: rpcResult(z.object({ files: z.array(caseFileSchema) }))
  },
  "env:diagnostics": {
    input: envDiagnosticsInputSchema,
    output: rpcResult(envDiagnosticsSchema)
  }
} as const;

export type IpcChannel = keyof typeof ipcContract;

export interface IpcMap {
  "clients:list": {
    input: z.infer<typeof clientListInputSchema>;
    output: RpcResult<{ items: z.infer<typeof clientSchema>[] }>;
  };
  "clients:create": {
    input: z.infer<typeof clientCreateInputSchema>;
    output: RpcResult<z.infer<typeof clientSchema>>;
  };
  "clients:update": {
    input: z.infer<typeof clientUpdateInputSchema>;
    output: RpcResult<z.infer<typeof clientSchema>>;
  };
  "clients:get": {
    input: z.infer<typeof clientGetInputSchema>;
    output: RpcResult<z.infer<typeof clientSchema>>;
  };
  "contracts:list": {
    input: z.infer<typeof contractListInputSchema>;
    output: RpcResult<{ items: z.infer<typeof contractSchema>[] }>;
  };
  "contracts:create": {
    input: z.infer<typeof contractCreateInputSchema>;
    output: RpcResult<z.infer<typeof contractSchema>>;
  };
  "contracts:updateStatus": {
    input: z.infer<typeof contractUpdateStatusInputSchema>;
    output: RpcResult<z.infer<typeof contractSchema>>;
  };
  "contracts:get": {
    input: z.infer<typeof contractGetInputSchema>;
    output: RpcResult<z.infer<typeof contractSchema>>;
  };
  "case:ensure": {
    input: z.infer<typeof caseEnsureInputSchema>;
    output: RpcResult<z.infer<typeof caseEnsureOutputSchema>>;
  };
  "case:openFolder": {
    input: z.infer<typeof caseOpenFolderInputSchema>;
    output: RpcResult<z.infer<typeof caseOpenFolderOutputSchema>>;
  };
  "documents:generateContractDocx": {
    input: z.infer<typeof docGenerateInputSchema>;
    output: RpcResult<z.infer<typeof docGenerateOutputSchema>>;
  };
  "documents:generateActDocx": {
    input: z.infer<typeof docGenerateInputSchema>;
    output: RpcResult<z.infer<typeof docGenerateOutputSchema>>;
  };
  "documents:convertToPdf": {
    input: z.infer<typeof convertToPdfInputSchema>;
    output: RpcResult<z.infer<typeof convertToPdfOutputSchema>>;
  };
  "pdf:merge": {
    input: z.infer<typeof pdfMergeInputSchema>;
    output: RpcResult<z.infer<typeof pdfMergeOutputSchema>>;
  };
  "files:importToCase": {
    input: z.infer<typeof fileImportInputSchema>;
    output: RpcResult<z.infer<typeof fileImportOutputSchema>>;
  };
  "files:listByContract": {
    input: z.infer<typeof filesListByContractInputSchema>;
    output: RpcResult<{ files: z.infer<typeof caseFileSchema>[] }>;
  };
  "env:diagnostics": {
    input: z.infer<typeof envDiagnosticsInputSchema>;
    output: RpcResult<z.infer<typeof envDiagnosticsSchema>>;
  };
}
