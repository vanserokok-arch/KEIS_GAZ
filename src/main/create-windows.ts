import path from "node:path";
import { BrowserWindow } from "electron";
import { attachNavigationGuards } from "./security/navigation-guards";

export function createMainWindow(devServerUrl?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: Boolean(devServerUrl),
      webSecurity: true
    }
  });

  attachNavigationGuards(win.webContents, devServerUrl);

  if (devServerUrl) {
    void win.loadURL(devServerUrl);
  } else {
    void win.loadFile(path.join(__dirname, "../../renderer/index.html"));
  }

  return win;
}
