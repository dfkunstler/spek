import { SpecGraph } from "@spekjs/ui";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { specRoute } from "@spekjs/core/spec-topic";
import { deriveSpecRelations, type RelationFilter } from "@spekjs/core/spec-relations";
import { useTheme } from "../contexts/ThemeContext";
import { useGraphData, useSpecContents } from "../hooks/useOpenSpec";
import {
  DEFAULT_FILTER,
  omittedSentence,
  parseGraphMode,
  parseMinWeight,
  specsViewState,
  unreadableSentence,
  type GraphMode,
} from "../utils/specsView";

const BASE =
  "text-xs px-2 py-0.5 rounded border transition-colors border-border text-text-muted hover:text-accent hover:border-accent";
const ACTIVE =
  "text-xs px-2 py-0.5 rounded border transition-colors border-accent text-accent bg-accent/10";

/**
 * `/graph` 頁。
 *
 * 力導向圖本身住在 `@spekjs/ui`（下游的 Electron 工作台用同一份）。這一頁只做**宿主的事**：
 * 取數、loading / error 狀態、主題訊號、以及把使用者的選擇接回 react-router。
 *
 * Two views of one component: the default spec ↔ change graph, and `?mode=specs`, which draws the
 * relations `@spekjs/core/spec-relations` derives between specs. The mode is a query parameter so a
 * view is linkable, and so it works the same under the web router and the webview's memory router.
 */
export function GraphView() {
  const [params, setParams] = useSearchParams();
  const mode = parseGraphMode(params.get("mode"));
  const setMode = useCallback(
    (next: GraphMode) =>
      setParams(
        (prev) => {
          const copy = new URLSearchParams(prev);
          if (next === "specs") copy.set("mode", "specs");
          else copy.delete("mode");
          return copy;
        },
        { replace: true },
      ),
    [setParams],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Graph</h1>
        <div className="flex items-center gap-1.5" role="group" aria-label="Graph view">
          <button
            onClick={() => setMode("changes")}
            className={mode === "changes" ? ACTIVE : BASE}
            aria-pressed={mode === "changes"}
          >
            Specs &amp; changes
          </button>
          <button
            onClick={() => setMode("specs")}
            className={mode === "specs" ? ACTIVE : BASE}
            aria-pressed={mode === "specs"}
          >
            Specs
          </button>
        </div>
      </div>
      {mode === "specs" ? <SpecsMode /> : <ChangesMode />}
    </div>
  );
}

function ChangesMode() {
  const { data, loading, error } = useGraphData();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleSelectSpec = useCallback(
    (topic: string) => navigate(specRoute(topic)),
    [navigate],
  );

  // 聚合圖的 change 節點帶著來源 worktree —— 導覽時要把它帶上，同名 slug 才分得出來。
  const handleSelectChange = useCallback(
    (slug: string, worktreeKey?: string) =>
      navigate(worktreeKey ? `/changes/${slug}?wt=${worktreeKey}` : `/changes/${slug}`),
    [navigate],
  );

  if (loading) {
    return <p className="text-text-muted">Loading graph...</p>;
  }
  if (error) {
    return <p className="text-status-error">Error: {error}</p>;
  }
  if (!data || data.edges.length === 0) {
    return <p className="text-text-muted">No spec-change relationships to visualize.</p>;
  }

  return (
    <div className="relative h-[calc(100vh-10rem)] bg-bg-primary border border-border rounded-lg overflow-hidden">
      <SpecGraph
        data={data}
        onSelectSpec={handleSelectSpec}
        onSelectChange={handleSelectChange}
        themeKey={theme}
      />
    </div>
  );
}

function SpecsMode() {
  const graph = useGraphData();
  const contents = useSpecContents(true);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<RelationFilter>(DEFAULT_FILTER);

  const handleSelectSpec = useCallback(
    (topic: string) => navigate(specRoute(topic)),
    [navigate],
  );

  const relations = useMemo(
    () =>
      graph.data && contents.data
        ? deriveSpecRelations({ specs: contents.data.contents, graph: graph.data })
        : null,
    [graph.data, contents.data],
  );

  const view = useMemo(
    () => (relations && contents.data ? specsViewState(relations, contents.data.specs, filter) : null),
    [relations, contents.data, filter],
  );

  if (graph.loading || contents.loading) {
    return <p className="text-text-muted">Loading specs...</p>;
  }
  const error = graph.error ?? contents.error;
  if (error) {
    return <p className="text-status-error">Error: {error}</p>;
  }
  if (!view || !contents.data) {
    return <p className="text-text-muted">No specs to visualize.</p>;
  }

  const notes = [omittedSentence(view.kind === "no-kinds" ? 0 : view.omitted), unreadableSentence(contents.data.unreadable)].filter(
    (n): n is string => n !== null,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap text-xs text-text-secondary">
        <div className="flex items-center gap-1.5" role="group" aria-label="Edge kinds">
          <button
            onClick={() => setFilter((f) => ({ ...f, references: !f.references }))}
            className={filter.references ? ACTIVE : BASE}
            aria-pressed={filter.references}
            title="A spec's prose names another spec"
          >
            References
          </button>
          <button
            onClick={() => setFilter((f) => ({ ...f, changedTogether: !f.changedTogether }))}
            className={filter.changedTogether ? ACTIVE : BASE}
            aria-pressed={filter.changedTogether}
            title="Two specs modified by the same change"
          >
            Changed together
          </button>
        </div>
        <label className="flex items-center gap-1.5">
          <span>Min. shared changes</span>
          <input
            type="number"
            min={1}
            value={filter.minWeight}
            disabled={!filter.changedTogether}
            onChange={(e) => setFilter((f) => ({ ...f, minWeight: parseMinWeight(e.target.value) }))}
            className="w-14 rounded border border-border bg-bg-tertiary text-text-secondary px-1.5 py-0.5 disabled:opacity-50"
          />
        </label>
        {notes.length > 0 && <span className="text-text-muted">{notes.join(" · ")}</span>}
      </div>

      {view.kind === "no-kinds" && (
        <p className="text-text-muted">Select at least one kind of relationship to draw.</p>
      )}
      {view.kind === "empty" && (
        <p className="text-text-muted">No spec relationships to visualize.</p>
      )}
      {view.kind === "ready" && (
        <div className="relative h-[calc(100vh-13rem)] bg-bg-primary border border-border rounded-lg overflow-hidden">
          <SpecGraph data={view.data} onSelectSpec={handleSelectSpec} themeKey={theme} />
        </div>
      )}
    </div>
  );
}
