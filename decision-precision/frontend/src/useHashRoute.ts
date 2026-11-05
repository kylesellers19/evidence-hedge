import { useEffect, useState } from "react";

export type Route = "canvas" | "atlas" | "decision";

/** Dependency-free hash routing: #/atlas -> Atlas, #/decision -> Decision, everything else -> canvas. */
export function useHashRoute(): [Route, (r: Route) => void] {
  const read = (): Route => {
    const h = window.location.hash.replace(/^#\/?/, "");
    return h === "atlas" || h === "decision" ? h : "canvas";
  };
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (r: Route) => {
    window.location.hash = r === "canvas" ? "/" : `/${r}`;
  };
  return [route, go];
}
