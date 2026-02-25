import { useEffect, useState } from "react";
import type { ClientDto, UiNoticeError } from "../../../shared/types";
import { getKeisApi } from "../../api/keisApi";

interface ClientsPageProps {
  onError: (message: UiNoticeError) => void;
}

export function ClientsPage({ onError }: ClientsPageProps) {
  const api = getKeisApi();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ClientDto[]>([]);
  const [fio, setFio] = useState("");
  const [address, setAddress] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ fio: string; address: string }>({ fio: "", address: "" });

  async function load() {
    const res = await api.clientsList({ search });
    if (!res.ok) {
      onError(res.error);
      return;
    }
    setItems(res.data.items);
    if (res.data.items.length > 0 && !selectedId) {
      const first = res.data.items[0];
      if (first) {
        setSelectedId(first.id);
        setEditing({ fio: first.fio, address: first.address ?? "" });
      }
    }
  }

  useEffect(() => {
    void load();
  }, [search]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="grid-2">
      <section className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Клиенты</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск" />
          <button type="button" onClick={() => void load()}>
            Обновить
          </button>
        </div>
        <div className="list" style={{ marginTop: 10 }}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`list-item ${selectedId === item.id ? "active" : ""}`}
              onClick={() => {
                setSelectedId(item.id);
                setEditing({ fio: item.fio, address: item.address ?? "" });
              }}
            >
              <div>{item.fio}</div>
              <div className="small muted">{item.address ?? "Без адреса"}</div>
            </button>
          ))}
          {items.length === 0 ? <div className="muted">Нет клиентов</div> : null}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Создать клиента</h2>
        <div className="row">
          <input value={fio} onChange={(e) => setFio(e.target.value)} placeholder="ФИО" />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Адрес" />
          <button
            type="button"
            className="primary"
            onClick={async () => {
              const res = await api.clientsCreate({ fio, address });
              if (!res.ok) {
                onError(res.error);
                return;
              }
              setFio("");
              setAddress("");
              await load();
            }}
          >
            Создать
          </button>
        </div>

        <hr />

        <h3>Карточка клиента</h3>
        {selected ? (
          <>
            <div className="row">
              <input
                value={editing.fio}
                onChange={(e) => setEditing((prev) => ({ ...prev, fio: e.target.value }))}
                placeholder="ФИО"
              />
              <input
                value={editing.address}
                onChange={(e) => setEditing((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Адрес"
              />
              <button
                type="button"
                onClick={async () => {
                  const res = await api.clientsUpdate({
                    id: selected.id,
                    fio: editing.fio,
                    address: editing.address
                  });
                  if (!res.ok) {
                    onError(res.error);
                    return;
                  }
                  await load();
                }}
              >
                Сохранить
              </button>
            </div>
            <div className="small muted">ID: {selected.id}</div>
          </>
        ) : (
          <div className="muted">Выберите клиента слева</div>
        )}
      </section>
    </div>
  );
}
