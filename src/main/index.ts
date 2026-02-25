import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./create-windows";
import { applyElectronHardening } from "./security/hardening";
import { registerIpcHandlers } from "./ipc/ipc";
import { getAppDb } from "./db/app-db";
import { ClientsRepo } from "./db/repo/clients.repo";
import { ContractsRepo } from "./db/repo/contracts.repo";
import { FilesRepo } from "./db/repo/files.repo";
import { DocumentsService } from "./documents/documents";

export function getUserDataDir(): string {
  return process.env.KEIS_USER_DATA_DIR?.trim() || app.getPath("userData");
}

export function createServices() {
  const dbDir = getUserDataDir();
  const { db } = getAppDb(dbDir);
  const clientsRepo = new ClientsRepo(db);
  const contractsRepo = new ContractsRepo(db);
  const filesRepo = new FilesRepo(db);
  const documents = new DocumentsService({ clientsRepo, contractsRepo, filesRepo });

  return { clientsRepo, contractsRepo, filesRepo, documents };
}

async function bootstrap(): Promise<void> {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL?.trim();
  await app.whenReady();
  applyElectronHardening(devServerUrl);
  const services = createServices();
  registerIpcHandlers(services);
  createMainWindow(devServerUrl);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(devServerUrl);
    }
  });
}

if (require.main === module) {
  void bootstrap();

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
