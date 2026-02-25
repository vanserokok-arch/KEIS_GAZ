import type { IpcMap } from "../../shared/ipc";

declare global {
  interface KeisApi {
    clientsList(input: IpcMap["clients:list"]["input"]): Promise<IpcMap["clients:list"]["output"]>;
    clientsCreate(input: IpcMap["clients:create"]["input"]): Promise<IpcMap["clients:create"]["output"]>;
    clientsUpdate(input: IpcMap["clients:update"]["input"]): Promise<IpcMap["clients:update"]["output"]>;
    clientsGet(input: IpcMap["clients:get"]["input"]): Promise<IpcMap["clients:get"]["output"]>;
    contractsList(input: IpcMap["contracts:list"]["input"]): Promise<IpcMap["contracts:list"]["output"]>;
    contractsCreate(
      input: IpcMap["contracts:create"]["input"]
    ): Promise<IpcMap["contracts:create"]["output"]>;
    contractsUpdateStatus(
      input: IpcMap["contracts:updateStatus"]["input"]
    ): Promise<IpcMap["contracts:updateStatus"]["output"]>;
    contractsGet(input: IpcMap["contracts:get"]["input"]): Promise<IpcMap["contracts:get"]["output"]>;
    caseEnsure(input: IpcMap["case:ensure"]["input"]): Promise<IpcMap["case:ensure"]["output"]>;
    caseOpenFolder(input: IpcMap["case:openFolder"]["input"]): Promise<IpcMap["case:openFolder"]["output"]>;
    documentsGenerateContractDocx(
      input: IpcMap["documents:generateContractDocx"]["input"]
    ): Promise<IpcMap["documents:generateContractDocx"]["output"]>;
    documentsGenerateActDocx(
      input: IpcMap["documents:generateActDocx"]["input"]
    ): Promise<IpcMap["documents:generateActDocx"]["output"]>;
    documentsConvertToPdf(
      input: IpcMap["documents:convertToPdf"]["input"]
    ): Promise<IpcMap["documents:convertToPdf"]["output"]>;
    pdfMerge(input: IpcMap["pdf:merge"]["input"]): Promise<IpcMap["pdf:merge"]["output"]>;
    filesImportToCase(
      input: IpcMap["files:importToCase"]["input"]
    ): Promise<IpcMap["files:importToCase"]["output"]>;
    filesListByContract(
      input: IpcMap["files:listByContract"]["input"]
    ): Promise<IpcMap["files:listByContract"]["output"]>;
    envDiagnostics(
      input: IpcMap["env:diagnostics"]["input"]
    ): Promise<IpcMap["env:diagnostics"]["output"]>;
  }

  interface Window {
    keisApi: KeisApi;
  }
}

export {};
