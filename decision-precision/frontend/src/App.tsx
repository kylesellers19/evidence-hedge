import { ReactFlowProvider } from "@xyflow/react";
import { GraphCanvas } from "./graph/GraphCanvas";
import { useDelib } from "./graph/useDelib";
import { SidePanel } from "./panel/SidePanel";
import { Legend } from "./ui/Legend";
import { Toolbar } from "./ui/Toolbar";

export default function App() {
  const d = useDelib();

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        view={d.view}
        setView={d.setView}
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
    </div>
  );
}
