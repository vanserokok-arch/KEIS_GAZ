import { useEffect, useState } from "react";
import type { EnvDiagnosticsDto, UiNoticeError } from "../../../shared/types";
import { getKeisApi } from "../../api/keisApi";

interface SettingsPageProps {
  onError: (error: UiNoticeError) => void;
}

export function SettingsPage({ onError }: SettingsPageProps) {
  const api = getKeisApi();
  const [diag, setDiag] = useState<EnvDiagnosticsDto | null>(null);

  async function load() {
    const res = await api.envDiagnostics({});
    if (!res.ok) {
      onError(res.error);
      return;
    }
    setDiag(res.data);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="card">
      <div className="row">
        <h2 style={{ margin: 0 }}>Диагностика окружения</h2>
        <button type="button" onClick={() => void load()}>
          Обновить
        </button>
      </div>
      {!diag ? (
        <div className="muted">Загрузка...</div>
      ) : (
        <div className="list" style={{ maxHeight: "none" }}>
          <div className="list-item">
            <strong>LibreOffice:</strong> {diag.hasLibreOffice ? "Да" : "Нет"}
            <div className="small muted">
              {diag.hasLibreOffice
                ? `${diag.libreOfficePath ?? ""} ${diag.libreOfficeVersion ?? ""}`
                : "Установите LibreOffice для конвертации DOCX -> PDF"}
            </div>
          </div>
          <div className="list-item">
            <strong>Base case dir:</strong>
            <div className="small muted">{diag.baseCaseDir}</div>
          </div>
          <div className="list-item">
            <strong>Allowed dirs:</strong>
            {diag.allowedDirs.map((dir) => (
              <div key={dir} className="small muted">
                {dir}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
