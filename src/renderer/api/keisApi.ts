import type { IpcMap } from "../../shared/ipc";
import type { UiNoticeError } from "../../shared/types";

export type Notice = UiNoticeError & { id: number };

export function getKeisApi() {
  return window.keisApi;
}

export function resultNotice(error: UiNoticeError): string {
  return `${error.title}: ${error.message}${error.details ? ` (${error.details})` : ""}`;
}

export function isOk<T>(result: { ok: boolean; data?: T }): result is { ok: true; data: T } {
  return result.ok;
}

export type ApiMethodInput<K extends keyof IpcMap> = IpcMap[K]["input"];
export type ApiMethodOutput<K extends keyof IpcMap> = IpcMap[K]["output"];
