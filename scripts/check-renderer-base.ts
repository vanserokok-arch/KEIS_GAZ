import fs from "node:fs/promises";
import path from "node:path";

async function main(): Promise<void> {
  const htmlPath = path.join(process.cwd(), "dist", "renderer", "index.html");
  const html = await fs.readFile(htmlPath, "utf8");
  if (html.includes('src="/assets/') || html.includes('href="/assets/')) {
    throw new Error("Renderer build contains absolute /assets/ references");
  }
  console.log("check:renderer-base PASS");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
