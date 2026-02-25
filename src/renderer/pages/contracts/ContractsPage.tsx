import { useEffect, useMemo, useState } from "react";
import type {
  CaseFileDto,
  ClientDto,
  ContractDto,
  ContractStatus,
  UiNoticeError
} from "../../../shared/types";
import { getKeisApi } from "../../api/keisApi";

interface ContractsPageProps {
  onError: (error: UiNoticeError) => void;
}

const STATUSES: ContractStatus[] = ["draft", "formed", "printed", "in_progress", "done"];

export function ContractsPage({ onError }: ContractsPageProps) {
  const api = getKeisApi();
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [files, setFiles] = useState<CaseFileDto[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "">("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({ clientId: "", contractNumber: "", amount: "0" });
  const [mergeSelected, setMergeSelected] = useState<string[]>([]);
  const [lastActionInfo, setLastActionInfo] = useState<string>("");

  const selectedContract = contracts.find((c) => c.id === selectedId) ?? null;
  const pdfFiles = useMemo(() => files.filter((f) => f.kind === "pdf"), [files]);

  async function loadClients() {
    const res = await api.clientsList({ search: "" });
    if (!res.ok) {
      onError(res.error);
      return;
    }
    setClients(res.data.items);
    if (!createForm.clientId && res.data.items[0]) {
      setCreateForm((prev) => ({ ...prev, clientId: String(res.data.items[0]?.id ?? "") }));
    }
  }

  async function loadContracts() {
    const res = await api.contractsList({
      search,
      ...(statusFilter ? { status: statusFilter } : {})
    });
    if (!res.ok) {
      onError(res.error);
      return;
    }
    setContracts(res.data.items);
    if (!selectedId && res.data.items[0]) {
      setSelectedId(res.data.items[0].id);
    }
  }

  async function loadFiles(contractId: number) {
    const res = await api.filesListByContract({ contractId: String(contractId) });
    if (!res.ok) {
      onError(res.error);
      return;
    }
    setFiles(res.data.files);
  }

  useEffect(() => {
    void loadClients();
  }, []);

  useEffect(() => {
    void loadContracts();
  }, [search, statusFilter]);

  useEffect(() => {
    if (selectedId) {
      void loadFiles(selectedId);
    } else {
      setFiles([]);
    }
  }, [selectedId]);

  return (
    <div className="grid-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Договоры</h2>
        <div className="row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по номеру" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as ContractStatus | "") || "")}
          >
            <option value="">Все статусы</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void loadContracts()}>
            Обновить
          </button>
        </div>
        <div className="list" style={{ marginTop: 10 }}>
          {contracts.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`list-item ${selectedId === item.id ? "active" : ""}`}
              onClick={() => setSelectedId(item.id)}
            >
              <div>
                <strong>{item.contractNumber}</strong> <span className="muted">({item.status})</span>
              </div>
              <div className="small">Сумма: {item.amount}</div>
            </button>
          ))}
          {contracts.length === 0 ? <div className="muted">Нет договоров</div> : null}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Создать договор</h2>
        <div className="row">
          <select
            value={createForm.clientId}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, clientId: e.target.value }))}
          >
            <option value="">Выберите клиента</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.fio}
              </option>
            ))}
          </select>
          <input
            value={createForm.contractNumber}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, contractNumber: e.target.value }))}
            placeholder="Номер договора"
          />
          <input
            value={createForm.amount}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, amount: e.target.value }))}
            placeholder="Сумма"
            type="number"
            min="0"
            step="0.01"
          />
          <button
            type="button"
            className="primary"
            onClick={async () => {
              const res = await api.contractsCreate({
                clientId: Number(createForm.clientId),
                contractNumber: createForm.contractNumber,
                amount: Number(createForm.amount)
              });
              if (!res.ok) {
                onError(res.error);
                return;
              }
              setSelectedId(res.data.id);
              setCreateForm((prev) => ({ ...prev, contractNumber: "", amount: "0" }));
              await loadContracts();
            }}
          >
            Создать
          </button>
        </div>

        <hr />

        <h3>Карточка договора</h3>
        {!selectedContract ? (
          <div className="muted">Выберите договор слева</div>
        ) : (
          <>
            <div className="row">
              <div>Номер: {selectedContract.contractNumber}</div>
              <div>Сумма: {selectedContract.amount}</div>
            </div>
            <div className="row">
              <label htmlFor="status-select">Статус</label>
              <select
                id="status-select"
                value={selectedContract.status}
                onChange={async (e) => {
                  const status = e.target.value as ContractStatus;
                  const res = await api.contractsUpdateStatus({ id: selectedContract.id, status });
                  if (!res.ok) {
                    onError(res.error);
                    return;
                  }
                  await loadContracts();
                }}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="card" style={{ background: "rgba(255,255,255,0.7)" }}>
              <div className="actions row">
                <button
                  type="button"
                  className="primary"
                  onClick={async () => {
                    const res = await api.caseEnsure({ contractId: selectedContract.id });
                    if (!res.ok) {
                      onError(res.error);
                      return;
                    }
                    setLastActionInfo(`Кейс создан: ${res.data.casePath}`);
                    await loadContracts();
                  }}
                >
                  Создать кейс
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await api.caseOpenFolder({ contractId: String(selectedContract.id) });
                    if (!res.ok) {
                      onError(res.error);
                      return;
                    }
                    setLastActionInfo("Папка дела открыта");
                  }}
                >
                  Открыть папку дела
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await api.documentsGenerateContractDocx({ contractId: selectedContract.id });
                    if (!res.ok) {
                      onError(res.error);
                      return;
                    }
                    setLastActionInfo(`DOCX: ${res.data.outputPath}`);
                    await loadFiles(selectedContract.id);
                  }}
                >
                  Сгенерировать договор DOCX
                </button>
              </div>
              {lastActionInfo ? <div className="small muted">{lastActionInfo}</div> : null}
            </div>

            <div className="card" style={{ background: "rgba(255,255,255,0.7)" }}>
              <h4 style={{ marginTop: 0 }}>PDF в кейсе (для merge)</h4>
              <div className="list" style={{ maxHeight: 180 }}>
                {pdfFiles.map((file) => {
                  const checked = mergeSelected.includes(file.id);
                  return (
                    <label key={file.id} className="list-item" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setMergeSelected((prev) =>
                            e.target.checked ? [...prev, file.id] : prev.filter((item) => item !== file.id)
                          );
                        }}
                      />{" "}
                      {file.displayName}
                    </label>
                  );
                })}
                {pdfFiles.length === 0 ? <div className="muted">PDF пока нет</div> : null}
              </div>
              <div className="row">
                <button
                  type="button"
                  onClick={async () => {
                    if (mergeSelected.length < 2) {
                      onError({
                        code: "MERGE_NEEDS_2",
                        title: "Недостаточно PDF",
                        message: "Выберите минимум 2 PDF"
                      });
                      return;
                    }
                    const res = await api.pdfMerge({
                      contractId: String(selectedContract.id),
                      fileIds: mergeSelected,
                      outputName: `merged_${Date.now()}.pdf`
                    });
                    if (!res.ok) {
                      onError(res.error);
                      return;
                    }
                    setLastActionInfo(`Merged PDF: ${res.data.outputPath}`);
                    setMergeSelected([]);
                    await loadFiles(selectedContract.id);
                  }}
                >
                  Мердж PDF
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
