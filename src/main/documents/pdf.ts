import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

export async function mergePdfs(inputPaths: string[], outputPath: string): Promise<number> {
  const out = await PDFDocument.create();
  let pageCount = 0;

  for (const inputPath of inputPaths) {
    const bytes = await fs.readFile(inputPath);
    const doc = await PDFDocument.load(bytes);
    const pages = await out.copyPages(doc, doc.getPageIndices());
    for (const page of pages) {
      out.addPage(page);
      pageCount += 1;
    }
  }

  await fs.writeFile(outputPath, await out.save());
  return pageCount;
}

export async function createTestPdf(outputPath: string, text: string): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  page.drawText(text, { x: 50, y: 780, size: 18 });
  await fs.writeFile(outputPath, await doc.save());
}
