import { shell, type WebContents } from "electron";

function isAllowedAppUrl(url: string, devServerUrl?: string): boolean {
  if (devServerUrl && url.startsWith(devServerUrl)) {
    return true;
  }
  return url.startsWith("file://");
}

export function attachNavigationGuards(webContents: WebContents, devServerUrl?: string): void {
  webContents.on("will-navigate", (event, url) => {
    if (!isAllowedAppUrl(url, devServerUrl)) {
      event.preventDefault();
    }
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
}
