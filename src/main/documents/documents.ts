import fs from "node:fs/promises";
import path from "node:path";
import { getCaseSubdir, ensureCaseDirs, writeCaseManifest } from "./case-builder";
import { convertDocToPdfWithLibreOffice, detectLibreOffice } from "./libreoffice";
import { mergePdfs } from "./pdf";
import { renderSimpleDocx } from "./templates";
import type { CASE_SUBDIRS } from "../../shared/utils/case-paths";
import type { ClientDto, ContractDto, FileRecordDto, UiNoticeError } from "../../shared/types";
import { assertSafeFileName, gateImportSourcePath, sanitizeAndGateAbsolutePath } from "../ipc/paths";
import { uiError } from "../ipc/errors";
import type { ClientsRepo } from "../db/repo/clients.repo";
import type { ContractsRepo } from "../db/repo/contracts.repo";
import type { FilesRepo } from "../db/repo/files.repo";

interface DocumentsDeps {
  clientsRepo: ClientsRepo;
  contractsRepo: ContractsRepo;
  filesRepo: FilesRepo;
}

export class DocumentsService {
  public constructor(private readonly deps: DocumentsDeps) {}

  public async ensureCase(contractId: number): Promise<{
    contractId: number;
    casePath: string;
    subdirs: string[];
    manifestPath: string;
  }> {
    const contract = this.deps.contractsRepo.getById(contractId);
    const client = this.deps.clientsRepo.getById(contract.clientId);
    const ensured = await ensureCaseDirs({
      clientFio: client.fio,
      contractNumber: contract.contractNumber
    });
    this.deps.contractsRepo.updateCasePath(contractId, ensured.casePath);
    return { contractId, ...ensured };
  }

  private getContractAndCase(contractId: number): { contract: ContractDto; client: ClientDto; casePath: string } {
    const contract = this.deps.contractsRepo.getById(contractId);
    const client = this.deps.clientsRepo.getById(contract.clientId);
    if (!contract.casePath) {
      throw uiError({
        code: "CASE_NOT_READY",
        title: "Кейс не создан",
        message: "Сначала создайте кейс договора"
      });
    }
    return { contract, client, casePath: contract.casePath };
  }

  private async saveDocx(args: {
    contractId: number;
    casePath: string;
    subdir: (typeof CASE_SUBDIRS)[number];
    fileName: string;
    title: string;
    contract: ContractDto;
    client: ClientDto;
  }): Promise<{ outputPath: string; fileRecordId: number }> {
    const dir = getCaseSubdir(args.casePath, args.subdir);
    await fs.mkdir(dir, { recursive: true });
    const outputPath = path.join(dir, assertSafeFileName(args.fileName));
    const buffer = await renderSimpleDocx({
      title: args.title,
      fio: args.client.fio,
      contractNumber: args.contract.contractNumber,
      amount: args.contract.amount,
      date: new Date().toISOString().slice(0, 10)
    });
    await fs.writeFile(outputPath, buffer);
    const relativePath = path.relative(args.casePath, outputPath).replaceAll(path.sep, "/");
    const record = this.deps.filesRepo.create({
      contractId: args.contractId,
      kind: "docx",
      displayName: path.basename(outputPath),
      relativePath
    });
    await writeCaseManifest(args.casePath);
    return { outputPath, fileRecordId: record.id };
  }

  public async generateContractDocx(contractId: number): Promise<{
    contractId: number;
    outputPath: string;
    fileRecordId: number;
  }> {
    const { contract, client, casePath } = this.getContractAndCase(contractId);
    const saved = await this.saveDocx({
      contractId,
      casePath,
      subdir: "01 Договор",
      fileName: `Договор_${contract.contractNumber}.docx`,
      title: "Договор",
      contract,
      client
    });
    return { contractId, ...saved };
  }

  public async generateActDocx(contractId: number): Promise<{
    contractId: number;
    outputPath: string;
    fileRecordId: number;
  }> {
    const { contract, client, casePath } = this.getContractAndCase(contractId);
    const saved = await this.saveDocx({
      contractId,
      casePath,
      subdir: "05 Акты",
      fileName: `Акт_${contract.contractNumber}.docx`,
      title: "Акт",
      contract,
      client
    });
    return { contractId, ...saved };
  }

  public async convertToPdf(input: {
    sourceAbsolutePath: string;
    contractId?: number;
  }): Promise<{ converted: boolean; outputPath: string | null; warning?: UiNoticeError }> {
    const sourcePath = await sanitizeAndGateAbsolutePath(input.sourceAbsolutePath, {
      allowExtensions: [".doc", ".docx", ".pdf"]
    });

    if (path.extname(sourcePath).toLowerCase() === ".pdf") {
      return { converted: true, outputPath: sourcePath };
    }

    const outDir = path.dirname(sourcePath);
    const result = await convertDocToPdfWithLibreOffice({ sourcePath, outputDir: outDir });
    if (!result) {
      return {
        converted: false,
        outputPath: null,
        warning: {
          code: "LO_NOT_FOUND",
          title: "LibreOffice не найден",
          message: "Конвертация в PDF недоступна",
          details: "Установите LibreOffice и повторите операцию"
        }
      };
    }

    if (input.contractId) {
      const contract = this.deps.contractsRepo.getById(input.contractId);
      if (contract.casePath) {
        const relativePath = path.relative(contract.casePath, result.outputPath).replaceAll(path.sep, "/");
        this.deps.filesRepo.create({
          contractId: input.contractId,
          kind: "pdf",
          displayName: path.basename(result.outputPath),
          relativePath
        });
        await writeCaseManifest(contract.casePath);
      }
    }

    return { converted: true, outputPath: result.outputPath };
  }

  public async mergePdf(input: {
    inputAbsolutePaths: string[];
    outputFileName: string;
    contractId: number;
  }): Promise<{ outputPath: string; pageCount: number }> {
    const { contract, casePath } = this.getContractAndCase(input.contractId);
    void contract;
    const validatedInputs: string[] = [];
    for (const p of input.inputAbsolutePaths) {
      validatedInputs.push(await sanitizeAndGateAbsolutePath(p, { allowExtensions: [".pdf"] }));
    }

    const outputDir = getCaseSubdir(casePath, "04 Документы");
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, assertSafeFileName(input.outputFileName));
    const pageCount = await mergePdfs(validatedInputs, outputPath);
    this.deps.filesRepo.create({
      contractId: input.contractId,
      kind: "pdf",
      displayName: path.basename(outputPath),
      relativePath: path.relative(casePath, outputPath).replaceAll(path.sep, "/")
    });
    await writeCaseManifest(casePath);
    return { outputPath, pageCount };
  }

  public async importToCase(input: {
    contractId: number;
    sourceAbsolutePath: string;
    kind: string;
  }): Promise<{ file: FileRecordDto }> {
    const { casePath } = this.getContractAndCase(input.contractId);
    const sourcePath = await gateImportSourcePath(input.sourceAbsolutePath);
    const targetDir = getCaseSubdir(casePath, "04 Документы");
    await fs.mkdir(targetDir, { recursive: true });
    const targetName = path.basename(sourcePath);
    const targetPath = path.join(targetDir, targetName);
    await fs.copyFile(sourcePath, targetPath);
    const record = this.deps.filesRepo.create({
      contractId: input.contractId,
      kind: input.kind,
      displayName: targetName,
      relativePath: path.relative(casePath, targetPath).replaceAll(path.sep, "/")
    });
    await writeCaseManifest(casePath);
    return { file: record };
  }

  public async diagnostics(): Promise<{
    hasLibreOffice: boolean;
    libreOfficePath: string | null;
    libreOfficeVersion: string | null;
  }> {
    return detectLibreOffice();
  }
}
