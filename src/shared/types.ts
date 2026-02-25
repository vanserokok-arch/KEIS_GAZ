export type ContractStatus =
  | "draft"
  | "formed"
  | "printed"
  | "in_progress"
  | "done";

export interface UiNoticeError {
  code: string;
  title: string;
  message: string;
  details?: string | undefined;
  action?: {
    label: string;
    url?: string | undefined;
  } | undefined;
}

export type RpcResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: UiNoticeError;
    };

export interface ClientDto {
  id: number;
  fio: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractDto {
  id: number;
  clientId: number;
  contractNumber: string;
  amount: number;
  status: ContractStatus;
  casePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecordDto {
  id: number;
  contractId: number;
  kind: string;
  displayName: string;
  relativePath: string;
  createdAt: string;
}

export interface CaseFileDto {
  id: string;
  contractId: string;
  displayName: string;
  relPath: string;
  ext: string;
  size?: number | undefined;
  createdAt: string;
  kind: "pdf" | "docx" | "other";
}

export interface EnvDiagnosticsDto {
  hasLibreOffice: boolean;
  libreOfficePath: string | null;
  libreOfficeVersion: string | null;
  baseCaseDir: string;
  allowedDirs: string[];
}
