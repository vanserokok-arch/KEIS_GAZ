export const CASE_SUBDIRS = [
  "01 Договор",
  "02 Приложения",
  "04 Документы",
  "05 Акты"
] as const;

export function buildClientSlug(fio: string): string {
  return fio
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .slice(0, 80);
}

export function buildContractSlug(contractNumber: string): string {
  return contractNumber
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .slice(0, 80);
}
