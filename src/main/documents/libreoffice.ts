import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const execFileAsync = promisify(execFile);

const CANDIDATES = [
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  "soffice"
];

export interface LibreOfficeInfo {
  hasLibreOffice: boolean;
  libreOfficePath: string | null;
  libreOfficeVersion: string | null;
}

async function tryVersion(candidate: string): Promise<{ path: string; version: string } | null> {
  try {
    const { stdout } = await execFileAsync(candidate, ["--version"], { timeout: 5000 });
    const version = stdout.trim() || "LibreOffice";
    return { path: candidate, version };
  } catch {
    return null;
  }
}

export async function detectLibreOffice(): Promise<LibreOfficeInfo> {
  for (const candidate of CANDIDATES) {
    const found = await tryVersion(candidate);
    if (found) {
      return {
        hasLibreOffice: true,
        libreOfficePath: found.path,
        libreOfficeVersion: found.version
      };
    }
  }

  return {
    hasLibreOffice: false,
    libreOfficePath: null,
    libreOfficeVersion: null
  };
}

export async function convertDocToPdfWithLibreOffice(params: {
  sourcePath: string;
  outputDir: string;
}): Promise<{ outputPath: string } | null> {
  const info = await detectLibreOffice();
  if (!info.hasLibreOffice || !info.libreOfficePath) {
    return null;
  }

  await fs.mkdir(params.outputDir, { recursive: true });
  await execFileAsync(
    info.libreOfficePath,
    ["--headless", "--convert-to", "pdf", "--outdir", params.outputDir, params.sourcePath],
    { timeout: 30000 }
  );

  const outputPath = path.join(
    params.outputDir,
    `${path.basename(params.sourcePath, path.extname(params.sourcePath))}.pdf`
  );
  await fs.access(outputPath);
  return { outputPath };
}
