import type { PropsWithChildren, ReactNode } from "react";
import type { UiNoticeItem } from "../../state/notices";

export type RouteKey = "clients" | "contracts" | "settings";

interface AppLayoutProps extends PropsWithChildren {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
  notices: UiNoticeItem[];
  onDismissNotice: (id: number) => void;
  headerExtras?: ReactNode;
}

export function AppLayout(props: AppLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">KEIS Contract System</div>
        <nav className="nav">
          {([
            ["clients", "Клиенты"],
            ["contracts", "Договоры"],
            ["settings", "Настройки"]
          ] as const).map(([key, label]) => (
            <button
              key={key}
              className={props.route === key ? "active" : ""}
              onClick={() => props.onRouteChange(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        {props.headerExtras}
        {props.notices.map((n) => (
          <div key={n.id} className="notice">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{n.title}</strong>
              <button type="button" onClick={() => props.onDismissNotice(n.id)}>
                Закрыть
              </button>
            </div>
            <div>{n.message}</div>
            {n.details ? <div className="small muted">{n.details}</div> : null}
          </div>
        ))}
        {props.children}
      </main>
    </div>
  );
}
