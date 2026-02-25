import { contextBridge, ipcRenderer } from "electron";
import type { IpcChannel, IpcMap } from "../shared/ipc";
import type { RpcResult, UiNoticeError } from "../shared/types";

async function safeInvoke<K extends IpcChannel>(channel: K, input: IpcMap[K]["input"]): Promise<IpcMap[K]["output"]> {
  try {
    const result = (await ipcRenderer.invoke(channel, input)) as IpcMap[K]["output"];
    return result;
  } catch (error) {
    const fallback: UiNoticeError = {
      code: "IPC_INVOKE_ERROR",
      title: "Ошибка IPC",
      message: "Не удалось выполнить операцию",
      details: error instanceof Error ? error.message : "Unknown error"
    };
    return { ok: false, error: fallback } as RpcResult<never> as IpcMap[K]["output"];
  }
}

export const keisApi = {
  clientsList: (input: IpcMap["clients:list"]["input"]) => safeInvoke("clients:list", input),
  clientsCreate: (input: IpcMap["clients:create"]["input"]) => safeInvoke("clients:create", input),
  clientsUpdate: (input: IpcMap["clients:update"]["input"]) => safeInvoke("clients:update", input),
  clientsGet: (input: IpcMap["clients:get"]["input"]) => safeInvoke("clients:get", input),
  contractsList: (input: IpcMap["contracts:list"]["input"]) => safeInvoke("contracts:list", input),
  contractsCreate: (input: IpcMap["contracts:create"]["input"]) => safeInvoke("contracts:create", input),
  contractsUpdateStatus: (input: IpcMap["contracts:updateStatus"]["input"]) =>
    safeInvoke("contracts:updateStatus", input),
  contractsGet: (input: IpcMap["contracts:get"]["input"]) => safeInvoke("contracts:get", input),
  caseEnsure: (input: IpcMap["case:ensure"]["input"]) => safeInvoke("case:ensure", input),
  caseOpenFolder: (input: IpcMap["case:openFolder"]["input"]) => safeInvoke("case:openFolder", input),
  documentsGenerateContractDocx: (input: IpcMap["documents:generateContractDocx"]["input"]) =>
    safeInvoke("documents:generateContractDocx", input),
  documentsGenerateActDocx: (input: IpcMap["documents:generateActDocx"]["input"]) =>
    safeInvoke("documents:generateActDocx", input),
  documentsConvertToPdf: (input: IpcMap["documents:convertToPdf"]["input"]) =>
    safeInvoke("documents:convertToPdf", input),
  pdfMerge: (input: IpcMap["pdf:merge"]["input"]) => safeInvoke("pdf:merge", input),
  filesImportToCase: (input: IpcMap["files:importToCase"]["input"]) => safeInvoke("files:importToCase", input),
  filesListByContract: (input: IpcMap["files:listByContract"]["input"]) =>
    safeInvoke("files:listByContract", input),
  envDiagnostics: (input: IpcMap["env:diagnostics"]["input"]) => safeInvoke("env:diagnostics", input)
};

contextBridge.exposeInMainWorld("keisApi", keisApi);
