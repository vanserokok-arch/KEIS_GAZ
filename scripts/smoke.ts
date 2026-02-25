import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createAppDb, resetAppDbForTests } from "../src/main/db/app-db";
import { ClientsRepo } from "../src/main/db/repo/clients.repo";
import { ContractsRepo } from "../src/main/db/repo/contracts.repo";
import { FilesRepo } from "../src/main/db/repo/files.repo";
import { DocumentsService } from "../src/main/documents/documents";
import { createTestPdf } from "../src/main/documents/pdf";
import { invokeIpcChannel, type MainServices } from "../src/main/ipc/ipc";
import { getAllowedDirs } from "../src/main/ipc/paths";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function ensureAllowedDirs(): Promise<void> {
  for (const dir of getAllowedDirs()) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function main(): Promise<void> {
  await ensureAllowedDirs();

  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "keis-userdata-"));
  resetAppDbForTests();
  const { db } = createAppDb(userDataDir);
  const services: MainServices = {
    clientsRepo: new ClientsRepo(db),
    contractsRepo: new ContractsRepo(db),
    filesRepo: new FilesRepo(db),
    documents: null as unknown as DocumentsService
  };
  services.documents = new DocumentsService({
    clientsRepo: services.clientsRepo,
    contractsRepo: services.contractsRepo,
    filesRepo: services.filesRepo
  });

  const client = await invokeIpcChannel(services, "clients:create", {
    fio: "Иванов Иван Иванович",
    address: "Москва"
  });
  assert(client.ok, `clients:create failed: ${JSON.stringify(client)}`);

  const contract = await invokeIpcChannel(services, "contracts:create", {
    clientId: client.data.id,
    contractNumber: `SMOKE-${Date.now()}`,
    amount: 12345.67
  });
  assert(contract.ok, `contracts:create failed: ${JSON.stringify(contract)}`);

  const ensured = await invokeIpcChannel(services, "case:ensure", { contractId: contract.data.id });
  assert(ensured.ok, `case:ensure failed: ${JSON.stringify(ensured)}`);

  const docx = await invokeIpcChannel(services, "documents:generateContractDocx", {
    contractId: contract.data.id
  });
  assert(docx.ok, `generateContractDocx failed: ${JSON.stringify(docx)}`);
  await fs.access(docx.data.outputPath);

  const convert = await invokeIpcChannel(services, "documents:convertToPdf", {
    sourceAbsolutePath: docx.data.outputPath,
    contractId: contract.data.id
  });
  assert(convert.ok, `convertToPdf invocation failed: ${JSON.stringify(convert)}`);
  if (convert.data.converted) {
    assert(convert.data.outputPath, "convertToPdf converted=true but no outputPath");
    await fs.access(convert.data.outputPath);
  } else {
    assert(convert.data.warning?.code === "LO_NOT_FOUND", "expected LO_NOT_FOUND warning");
  }

  const downloadsScratch = path.join(os.homedir(), "Downloads", `keis-smoke-${Date.now()}`);
  await fs.mkdir(downloadsScratch, { recursive: true });
  const pdf1 = path.join(downloadsScratch, "a.pdf");
  const pdf2 = path.join(downloadsScratch, "b.pdf");
  await createTestPdf(pdf1, "Smoke A");
  await createTestPdf(pdf2, "Smoke B");

  const merge = await invokeIpcChannel(services, "pdf:merge", {
    contractId: String(contract.data.id),
    fileIds: [],
    outputName: "merged_smoke.pdf"
  });
  assert(!merge.ok, "pdf:merge should fail when no fileIds due to zod min(2)");

  const importedPdf1 = await invokeIpcChannel(services, "files:importToCase", {
    contractId: contract.data.id,
    sourceAbsolutePath: pdf1,
    kind: "pdf"
  });
  assert(importedPdf1.ok, `files:importToCase #1 failed: ${JSON.stringify(importedPdf1)}`);

  const importedPdf2 = await invokeIpcChannel(services, "files:importToCase", {
    contractId: contract.data.id,
    sourceAbsolutePath: pdf2,
    kind: "pdf"
  });
  assert(importedPdf2.ok, `files:importToCase #2 failed: ${JSON.stringify(importedPdf2)}`);

  const listedFiles = await invokeIpcChannel(services, "files:listByContract", {
    contractId: String(contract.data.id)
  });
  assert(listedFiles.ok, `files:listByContract failed: ${JSON.stringify(listedFiles)}`);
  assert(Array.isArray(listedFiles.data.files), "files:listByContract must return files[]");
  for (const file of listedFiles.data.files) {
    assert(!("absolutePath" in file), "files:listByContract must not expose absolutePath");
  }

  const mergeCandidates = listedFiles.data.files.filter((file) => file.kind === "pdf").slice(0, 2);
  assert(mergeCandidates.length === 2, "Need 2 pdf files for merge by fileIds");
  const mergeByIds = await invokeIpcChannel(services, "pdf:merge", {
    contractId: String(contract.data.id),
    fileIds: mergeCandidates.map((file) => file.id),
    outputName: "merged_smoke.pdf"
  });
  assert(mergeByIds.ok, `pdf:merge(fileIds) failed: ${JSON.stringify(mergeByIds)}`);
  assert(mergeByIds.data.pageCount >= 2, "merged PDF should contain at least 2 pages");
  await fs.access(mergeByIds.data.outputPath);

  const noCaseContract = await invokeIpcChannel(services, "contracts:create", {
    clientId: client.data.id,
    contractNumber: `SMOKE-NOCASE-${Date.now()}`,
    amount: 1
  });
  assert(noCaseContract.ok, `contracts:create(no case) failed: ${JSON.stringify(noCaseContract)}`);
  const openFolderMissingCase = await invokeIpcChannel(services, "case:openFolder", {
    contractId: String(noCaseContract.data.id)
  });
  assert(
    !openFolderMissingCase.ok && openFolderMissingCase.error.code === "CASE_NOT_FOUND",
    "case:openFolder should return CASE_NOT_FOUND when case missing"
  );

  const invalidTraversal = await invokeIpcChannel(services, "files:importToCase", {
    contractId: contract.data.id,
    sourceAbsolutePath: "../bad.pdf",
    kind: "import"
  });
  assert(!invalidTraversal.ok && invalidTraversal.error.code === "PATH_NOT_ALLOWED", "Traversal path must fail");

  const invalidScheme = await invokeIpcChannel(services, "files:importToCase", {
    contractId: contract.data.id,
    sourceAbsolutePath: "scheme://bad.pdf",
    kind: "import"
  });
  assert(!invalidScheme.ok && invalidScheme.error.code === "PATH_NOT_ALLOWED", "Scheme path must fail");

  const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), "keis-outside-"));
  const outsideFile = path.join(outsideDir, "outside.pdf");
  await createTestPdf(outsideFile, "Outside");
  const outsideAttempt = await invokeIpcChannel(services, "files:importToCase", {
    contractId: contract.data.id,
    sourceAbsolutePath: outsideFile,
    kind: "import"
  });
  assert(!outsideAttempt.ok && outsideAttempt.error.code === "PATH_NOT_ALLOWED", "Outside allowlist path must fail");

  console.log("smoke PASS");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
