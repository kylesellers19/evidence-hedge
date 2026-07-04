import { useEffect, useState } from "react";

export type Route = "canvas" | "atlas";

/** Dependency-free hash routing: #/atlas -> Atlas, everything else -> canvas. */
export function useHashRoute(): [Route, (r: Route) => void] {
  const read = (): Route => (window.location.hash.replace(/^#\/?/, "") === "atlas" ? "atlas" : "canvas");
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (r: Route) => {
    window.location.hash = r === "atlas" ? "/atlas" : "/";
  };
  return [route, go];
}
