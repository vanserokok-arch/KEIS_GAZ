import { useState } from "react";
import { AppLayout, type RouteKey } from "./layout/AppLayout";
import { ClientsPage } from "../pages/clients/ClientsPage";
import { ContractsPage } from "../pages/contracts/ContractsPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { useNotices } from "../state/notices";
import type { UiNoticeError } from "../../shared/types";

export function AppRouter() {
  const [route, setRoute] = useState<RouteKey>("clients");
  const notices = useNotices();

  const onError = (error: UiNoticeError) => {
    notices.push(error);
  };

  return (
    <AppLayout route={route} onRouteChange={setRoute} notices={notices.items} onDismissNotice={notices.remove}>
      {route === "clients" ? <ClientsPage onError={onError} /> : null}
      {route === "contracts" ? <ContractsPage onError={onError} /> : null}
      {route === "settings" ? <SettingsPage onError={onError} /> : null}
    </AppLayout>
  );
}
