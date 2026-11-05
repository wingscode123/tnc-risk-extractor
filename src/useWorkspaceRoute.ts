import { useEffect, useState } from "react";
const paths: Record<string, string> = {
  analisis: "/app",
  riwayat: "/app/riwayat",
  template: "/app/contoh",
  compare: "/app/bandingkan",
};
function readRoute() {
  return {
    inWorkspace:
      location.pathname === "/app" || location.pathname.startsWith("/app/"),
    currentTab:
      Object.keys(paths).find((tab) => paths[tab] === location.pathname) ??
      "analisis",
  };
}
export function useWorkspaceRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const go = (path: string) => {
    if (location.pathname !== path) window.history.pushState({}, "", path);
    setRoute(readRoute());
    window.scrollTo(0, 0);
  };
  return {
    ...route,
    setCurrentTab: (tab: string) => go(paths[tab] ?? "/app"),
    navigate: (workspace: boolean) => go(workspace ? "/app" : "/"),
  };
}
