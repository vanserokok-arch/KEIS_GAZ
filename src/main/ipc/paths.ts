import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { uiError } from "./errors";

const ALLOWED_IMPORT_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".txt"
]);

function hasForbiddenPattern(rawPath: string): boolean {
  return (
    rawPath.includes("\0") ||
    rawPath.includes("://") ||
    rawPath.includes("..") ||
    rawPath.startsWith("file:")
  );
}

export function getAllowedDirs(): string[] {
  const home = os.homedir();
  return [
    path.join(home, "Documents", "KEIS"),
    path.join(home, "Downloads"),
    path.join(home, "Desktop")
  ];
}

export function getBaseCaseDir(): string {
  const [root] = getAllowedDirs();
  if (!root) {
    throw new Error("Allowed dirs not configured");
  }
  return path.join(root, "Клиенты");
}

export async function ensureBaseCaseDir(): Promise<string> {
  const dir = getBaseCaseDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function sanitizeAndGateAbsolutePath(
  rawPath: string,
  options?: { allowExtensions?: string[]; mustExist?: boolean }
): Promise<string> {
  const trimmed = rawPath.trim();
  if (!trimmed || hasForbiddenPattern(trimmed)) {
    throw uiError({
      code: "PATH_NOT_ALLOWED",
      title: "Недопустимый путь",
      message: "Путь отклонен проверкой безопасности",
      details: "Содержит запрещенные конструкции"
    });
  }

  if (!path.isAbsolute(trimmed)) {
    throw uiError({
      code: "PATH_NOT_ALLOWED",
      title: "Недопустимый путь",
      message: "Требуется абсолютный путь",
      details: trimmed
    });
  }

  const real = await fs.realpath(trimmed).catch(async () => {
    if (options?.mustExist === false) {
      const parentReal = await fs.realpath(path.dirname(trimmed));
      return path.join(parentReal, path.basename(trimmed));
    }
    throw uiError({
      code: "PATH_NOT_FOUND",
      title: "Путь не найден",
      message: "Файл или папка не существует",
      details: trimmed
    });
  });

  const allowedDirs = getAllowedDirs();
  const allowed = allowedDirs.some((dir) => real === dir || real.startsWith(`${dir}${path.sep}`));
  if (!allowed) {
    throw uiError({
      code: "PATH_NOT_ALLOWED",
      title: "Путь вне разрешенных папок",
      message: "Разрешены только папки Documents/KEIS, Downloads и Desktop",
      details: real
    });
  }

  if (options?.allowExtensions && options.allowExtensions.length > 0) {
    const ext = path.extname(real).toLowerCase();
    if (!options.allowExtensions.map((item) => item.toLowerCase()).includes(ext)) {
      throw uiError({
        code: "FILE_TYPE_NOT_ALLOWED",
        title: "Формат файла не поддерживается",
        message: "Выбран файл с недопустимым расширением",
        details: ext || "(без расширения)"
      });
    }
  }

  return real;
}

export async function gateImportSourcePath(rawPath: string): Promise<string> {
  return sanitizeAndGateAbsolutePath(rawPath, {
    allowExtensions: Array.from(ALLOWED_IMPORT_EXTENSIONS)
  });
}

export function assertSafeFileName(name: string): string {
  const normalized = name.trim();
  if (!normalized || normalized.includes("/") || normalized.includes("\\") || normalized.includes("..")) {
    throw uiError({
      code: "INVALID_FILE_NAME",
      title: "Недопустимое имя файла",
      message: "Имя файла содержит запрещенные символы"
    });
  }
  return normalized;
}
