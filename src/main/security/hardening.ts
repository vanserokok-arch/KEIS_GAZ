import { app, session } from "electron";
import { APP_CSP } from "./csp";

export function applyElectronHardening(devServerUrl?: string): void {
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event) => event.preventDefault());
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = {
      ...details.responseHeaders,
      "Content-Security-Policy": [APP_CSP]
    };

    if (devServerUrl && details.resourceType === "mainFrame" && details.url.startsWith(devServerUrl)) {
      callback({ cancel: false, responseHeaders: headers });
      return;
    }

    callback({ cancel: false, responseHeaders: headers });
  });
}
