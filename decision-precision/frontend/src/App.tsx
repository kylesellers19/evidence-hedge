import { ReactFlowProvider } from "@xyflow/react";
import { AtlasRoute } from "./atlas/AtlasRoute";
import { GraphCanvas } from "./graph/GraphCanvas";
import { useDelib } from "./graph/useDelib";
import { SidePanel } from "./panel/SidePanel";
import { Legend } from "./ui/Legend";
import { Toolbar } from "./ui/Toolbar";
import { useHashRoute, type Route } from "./useHashRoute";

function Nav({ route, go }: { route: Route; go: (r: Route) => void }) {
  const tab = (r: Route, label: string) => (
    <button
      onClick={() => go(r)}
      className={`rounded px-3 py-1 text-sm transition-colors ${
        route === r
          ? "bg-[var(--path-highlight)] text-white"
          : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </button>
  );
  return (
    <nav className="flex items-center gap-1 border-b border-[var(--hairline)] bg-[var(--surface-raised)] px-3 py-1.5">
      <span className="mr-2 text-sm font-semibold">DELIB</span>
      {tab("canvas", "Deliberation")}
      {tab("atlas", "Atlas")}
    </nav>
  );
}

function DeliberationApp() {
  const d = useDelib();
  return (
    <>
      <Toolbar
        view={d.view}
        setView={d.setView}
        excludeUncoded={d.excludeUncoded}
        setExcludeUncoded={d.setExcludeUncoded}
        onReset={d.reset}
        corrections={d.corrections}
        overlays={d.graph?.overlays ?? null}
        path={d.path}
        busy={d.busy}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {d.error && (
            <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded bg-[var(--grade-contradicted)] px-3 py-2 text-sm text-white">
              {d.error}
            </div>
          )}
          {d.graph ? (
            <ReactFlowProvider>
              <GraphCanvas
                graph={d.graph}
                path={d.path}
                selectedId={d.selectedId}
                excludeUncoded={d.view === "resolution" && d.excludeUncoded}
                onSelect={d.setSelectedId}
                onExpand={d.expand}
                onHover={d.hover}
                onClearHover={d.clearHover}
              />
              <Legend />
            </ReactFlowProvider>
          ) : (
            <div className="grid h-full place-items-center text-[var(--ink-muted)]">
              {d.busy ? "Loading graph…" : "No graph. Is the API running on :8000?"}
            </div>
          )}
        </div>

        {d.selected && d.graph && (
          <SidePanel
            node={d.selected}
            overlays={d.graph.overlays}
            onEdit={d.edit}
            onClose={() => d.setSelectedId(null)}
          />
        )}
      </div>
    </>
  );
}

export default function App() {
  const [route, go] = useHashRoute();
  return (
    <div className="flex h-screen flex-col">
      <Nav route={route} go={go} />
      {route === "atlas" ? <AtlasRoute /> : <DeliberationApp />}
    </div>
  );
}
