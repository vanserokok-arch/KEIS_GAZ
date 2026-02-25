import fs from "node:fs/promises";
import path from "node:path";
import { CASE_SUBDIRS, buildClientSlug, buildContractSlug } from "../../shared/utils/case-paths";
import { ensureBaseCaseDir } from "../ipc/paths";

interface EnsureCaseParams {
  clientFio: string;
  contractNumber: string;
}

interface ManifestFileItem {
  relativePath: string;
  size: number;
  mtime: string;
}

interface CaseManifest {
  version: 1;
  generatedAt: string;
  files: ManifestFileItem[];
}

async function walkFiles(root: string, dir: string, out: ManifestFileItem[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(root, fullPath, out);
      continue;
    }
    if (entry.name === "manifest.json" || entry.name.endsWith(".tmp")) {
      continue;
    }
    const stat = await fs.stat(fullPath);
    out.push({
      relativePath: path.relative(root, fullPath).replaceAll(path.sep, "/"),
      size: stat.size,
      mtime: stat.mtime.toISOString()
    });
  }
}

export async function writeCaseManifest(caseDir: string): Promise<string> {
  const files: ManifestFileItem[] = [];
  await walkFiles(caseDir, caseDir, files);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const manifest: CaseManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    files
  };

  const manifestPath = path.join(caseDir, "manifest.json");
  const tmpPath = `${manifestPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(manifest, null, 2), "utf8");
  await fs.rename(tmpPath, manifestPath);
  return manifestPath;
}

export async function ensureCaseDirs(input: EnsureCaseParams): Promise<{
  casePath: string;
  subdirs: string[];
  manifestPath: string;
}> {
  const baseDir = await ensureBaseCaseDir();
  const clientDir = path.join(baseDir, buildClientSlug(input.clientFio) || "client");
  const contractDir = path.join(clientDir, buildContractSlug(input.contractNumber) || "contract");

  await fs.mkdir(contractDir, { recursive: true });
  for (const subdir of CASE_SUBDIRS) {
    await fs.mkdir(path.join(contractDir, subdir), { recursive: true });
  }

  const manifestPath = await writeCaseManifest(contractDir);
  return {
    casePath: contractDir,
    subdirs: [...CASE_SUBDIRS],
    manifestPath
  };
}

export function getCaseSubdir(casePath: string, subdir: (typeof CASE_SUBDIRS)[number]): string {
  return path.join(casePath, subdir);
}
