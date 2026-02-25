import path from "node:path";
import fs from "node:fs/promises";
import { ipcMain, shell } from "electron";
import { ipcContract, type IpcChannel, type IpcMap } from "../../shared/ipc";
import { getBaseCaseDir, getAllowedDirs, gateImportSourcePath, sanitizeAndGateAbsolutePath } from "./paths";
import { normalizeUiError, uiError } from "./errors";
import type { ClientsRepo } from "../db/repo/clients.repo";
import type { ContractsRepo } from "../db/repo/contracts.repo";
import type { FilesRepo } from "../db/repo/files.repo";
import type { DocumentsService } from "../documents/documents";

export interface MainServices {
  clientsRepo: ClientsRepo;
  contractsRepo: ContractsRepo;
  filesRepo: FilesRepo;
  documents: DocumentsService;
}

function mapDbError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("UNIQUE constraint failed: contracts.contract_number")) {
    throw uiError({
      code: "CONTRACT_NUMBER_EXISTS",
      title: "Номер договора уже существует",
      message: "Укажите уникальный номер договора"
    });
  }
  throw error;
}

function parseIdString(id: string): number {
  const parsed = Number.parseInt(id, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw uiError({
      code: "INVALID_ID",
      title: "Некорректный идентификатор",
      message: "Передан неверный идентификатор"
    });
  }
  return parsed;
}

function normalizeCaseFileKind(kind: string, relPath: string): "pdf" | "docx" | "other" {
  const ext = path.extname(relPath).toLowerCase();
  if (ext === ".pdf") {
    return "pdf";
  }
  if (ext === ".docx") {
    return "docx";
  }
  if (kind === "pdf" || kind === "docx") {
    return kind;
  }
  return "other";
}

async function executeChannel(
  services: MainServices,
  channel: IpcChannel,
  input: unknown
): Promise<IpcMap[IpcChannel]["output"]> {
  switch (channel) {
    case "clients:list": {
      const payload = input as IpcMap["clients:list"]["input"];
      return { ok: true, data: { items: services.clientsRepo.list(payload.search) } };
    }
    case "clients:create":
      try {
        return { ok: true, data: services.clientsRepo.create(input as IpcMap["clients:create"]["input"]) };
      } catch (error) {
        mapDbError(error);
      }
      break;
    case "clients:update":
      return { ok: true, data: services.clientsRepo.update(input as IpcMap["clients:update"]["input"]) };
    case "clients:get": {
      const payload = input as IpcMap["clients:get"]["input"];
      return { ok: true, data: services.clientsRepo.getById(payload.id) };
    }
    case "contracts:list": {
      const payload = input as IpcMap["contracts:list"]["input"];
      const listInput = payload.status ? { search: payload.search, status: payload.status } : { search: payload.search };
      return { ok: true, data: { items: services.contractsRepo.list(listInput) } };
    }
    case "contracts:create":
      try {
        return {
          ok: true,
          data: services.contractsRepo.create(input as IpcMap["contracts:create"]["input"])
        };
      } catch (error) {
        mapDbError(error);
      }
      break;
    case "contracts:updateStatus": {
      const payload = input as IpcMap["contracts:updateStatus"]["input"];
      return {
        ok: true,
        data: services.contractsRepo.updateStatus(payload.id, payload.status)
      };
    }
    case "contracts:get": {
      const payload = input as IpcMap["contracts:get"]["input"];
      return { ok: true, data: services.contractsRepo.getById(payload.id) };
    }
    case "case:ensure": {
      const payload = input as IpcMap["case:ensure"]["input"];
      return { ok: true, data: await services.documents.ensureCase(payload.contractId) };
    }
    case "case:openFolder": {
      const payload = input as IpcMap["case:openFolder"]["input"];
      const contractId = parseIdString(payload.contractId);
      const contract = services.contractsRepo.getById(contractId);
      const caseDir = contract.casePath;
      if (!caseDir) {
        throw uiError({
          code: "CASE_NOT_FOUND",
          title: "Папка дела не найдена",
          message: "Сначала создайте кейс договора",
          action: { label: "Создать кейс" }
        });
      }
      await fs.access(caseDir).catch(() => {
        throw uiError({
          code: "CASE_NOT_FOUND",
          title: "Папка дела не найдена",
          message: "Сначала создайте кейс договора",
          action: { label: "Создать кейс" }
        });
      });
      const gatedCaseDir = await sanitizeAndGateAbsolutePath(caseDir, { mustExist: true });
      const shellError = await shell.openPath(gatedCaseDir);
      if (shellError) {
        throw uiError({
          code: "OPEN_FOLDER_FAILED",
          title: "Не удалось открыть папку",
          message: "Операционная система не смогла открыть папку дела",
          details: shellError.slice(0, 300)
        });
      }
      return { ok: true, data: { opened: true } };
    }
    case "documents:generateContractDocx": {
      const payload = input as IpcMap["documents:generateContractDocx"]["input"];
      return {
        ok: true,
        data: await services.documents.generateContractDocx(payload.contractId)
      };
    }
    case "documents:generateActDocx": {
      const payload = input as IpcMap["documents:generateActDocx"]["input"];
      return { ok: true, data: await services.documents.generateActDocx(payload.contractId) };
    }
    case "documents:convertToPdf": {
      const payload = input as IpcMap["documents:convertToPdf"]["input"];
      const safePath = await sanitizeAndGateAbsolutePath(payload.sourceAbsolutePath, {
        allowExtensions: [".doc", ".docx", ".pdf"]
      });
      const convertInput = payload.contractId
        ? { sourceAbsolutePath: safePath, contractId: payload.contractId }
        : { sourceAbsolutePath: safePath };
      return {
        ok: true,
        data: await services.documents.convertToPdf(convertInput)
      };
    }
    case "pdf:merge": {
      const payload = input as IpcMap["pdf:merge"]["input"];
      const contractId = parseIdString(payload.contractId);
      const contract = services.contractsRepo.getById(contractId);
      if (!contract.casePath) {
        throw uiError({
          code: "CASE_NOT_FOUND",
          title: "Кейс не найден",
          message: "Сначала создайте кейс договора"
        });
      }
      const caseDir = await sanitizeAndGateAbsolutePath(contract.casePath, { mustExist: true });
      const fileIds = payload.fileIds.map(parseIdString);
      const fileRecords = services.filesRepo.listByIds(fileIds);
      const fileMap = new Map(fileRecords.map((file) => [file.id, file]));
      const gatedPaths: string[] = [];
      for (const fileId of fileIds) {
        const file = fileMap.get(fileId);
        if (!file || file.contractId !== contractId) {
          throw uiError({
            code: "FILE_NOT_FOUND",
            title: "Файл не найден",
            message: "Выбранный файл не относится к этому договору"
          });
        }
        const absolutePath = path.join(caseDir, ...file.relativePath.split("/"));
        gatedPaths.push(await sanitizeAndGateAbsolutePath(absolutePath, { allowExtensions: [".pdf"] }));
      }
      const outputFileName = payload.outputName?.trim() || `merged_${Date.now()}.pdf`;
      return {
        ok: true,
        data: await services.documents.mergePdf({
          contractId,
          inputAbsolutePaths: gatedPaths,
          outputFileName
        })
      };
    }
    case "files:importToCase": {
      const payload = input as IpcMap["files:importToCase"]["input"];
      const safeSource = await gateImportSourcePath(payload.sourceAbsolutePath);
      return {
        ok: true,
        data: await services.documents.importToCase({ ...payload, sourceAbsolutePath: safeSource })
      };
    }
    case "files:listByContract": {
      const payload = input as IpcMap["files:listByContract"]["input"];
      const contractId = parseIdString(payload.contractId);
      return {
        ok: true,
        data: {
          files: services.filesRepo.listByContract(contractId).map((file) => {
            const ext = path.extname(file.relativePath).toLowerCase();
            return {
              id: String(file.id),
              contractId: String(file.contractId),
              displayName: file.displayName,
              relPath: file.relativePath,
              ext,
              createdAt: file.createdAt,
              kind: normalizeCaseFileKind(file.kind, file.relativePath)
            };
          })
        }
      };
    }
    case "env:diagnostics": {
      const diag = await services.documents.diagnostics();
      return {
        ok: true,
        data: {
          ...diag,
          baseCaseDir: getBaseCaseDir(),
          allowedDirs: getAllowedDirs()
        }
      };
    }
    default:
      throw uiError({
        code: "IPC_NOT_IMPLEMENTED",
        title: "Команда не поддерживается",
        message: `Канал не реализован: ${String(channel)}`
      });
  }

  throw uiError({
    code: "IPC_EXECUTION_ERROR",
    title: "Ошибка выполнения",
    message: `Не удалось выполнить канал ${channel}`
  });
}

export function registerIpcHandlers(services: MainServices): void {
  (Object.keys(ipcContract) as IpcChannel[]).forEach((channel) => {
    ipcMain.handle(channel, async (_event, rawInput) => {
      return invokeIpcChannel(services, channel, rawInput);
    });
  });
}

export async function invokeIpcChannel<K extends IpcChannel>(
  services: MainServices,
  channel: K,
  rawInput: unknown
): Promise<IpcMap[K]["output"]> {
  try {
    const parsedInput = ipcContract[channel].input.parse(rawInput) as IpcMap[K]["input"];
    const result = await executeChannel(services, channel, parsedInput);
    return ipcContract[channel].output.parse(result) as IpcMap[K]["output"];
  } catch (error) {
    const uiNotice = normalizeUiError(error, "IPC_HANDLER_ERROR");
    return { ok: false, error: uiNotice } as IpcMap[K]["output"];
  }
}
