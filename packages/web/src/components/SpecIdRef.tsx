import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, type To } from "react-router-dom";
import { specRoute } from "@spekjs/core/spec-topic";
import type { SpecIdEntry, SpecIdIndex, RetiredEntry } from "@spekjs/core/spec-ids";
import { EMPTY_SPEC_ID_INDEX } from "@spekjs/core/spec-ids";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { SpecIdIndexContext, useSpecIdIndex } from "../contexts/SpecIdIndexContext";

// The same classes as a spec-topic reference (`MarkdownRenderer`'s `specTopics`), so a citation reads as
// the one kind of thing it is and sits inside the palette `contrast.test.ts` already measures.
const REF_CLASS =
  "bg-bg-tertiary text-code-text hover:text-accent-hover px-1.5 py-0.5 rounded text-sm underline decoration-dotted transition-colors";
const RETIRED_CLASS =
  "bg-bg-tertiary text-text-muted px-1.5 py-0.5 rounded text-sm line-through decoration-dotted cursor-help";

/**
 * Where a citation goes. A main target is its spec page; a delta target is on the page already showing
 * that change's Specs tab, where its heading carries the `<topic>--` prefix. A scenario's anchor is its
 * requirement's (see `SpecIdEntry.anchor`).
 */
export function specIdTarget(entry: SpecIdEntry): To {
  if (entry.source === "change") return { hash: entry.anchor ? `#${entry.topic}--${entry.anchor}` : "" };
  return { pathname: specRoute(entry.topic), hash: entry.anchor ? `#${entry.anchor}` : "" };
}

type Resolved = { kind: "entry"; entry: SpecIdEntry } | { kind: "retired"; retired: RetiredEntry } | null;

/** A declared identifier wins; the index already guarantees a retired one is not also declared. */
export function resolveSpecId(index: SpecIdIndex, id: string): Resolved {
  const entry = index.entries[id];
  if (entry) return { kind: "entry", entry };
  const retired = index.retired[id];
  return retired ? { kind: "retired", retired } : null;
}

const POPOVER_WIDTH = 520;
const GAP = 6;

function Preview({
  id,
  anchorEl,
  onEnter,
  onLeave,
  children,
}: {
  id: string;
  anchorEl: HTMLElement;
  onEnter: () => void;
  onLeave: () => void;
  children: ReactNode;
}) {
  // Fixed to the viewport, from the trigger's box: the preview is portalled out of the paragraph (a block
  // inside a `<p>` is invalid, and a folded section's overflow would clip it), so it cannot be positioned
  // by its parent. Clamped to the viewport so a citation near an edge stays readable.
  const rect = anchorEl.getBoundingClientRect();
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = rect.bottom + GAP + 240 < window.innerHeight || rect.top < 260;
  const style = below
    ? { left, width, top: rect.bottom + GAP }
    : { left, width, bottom: window.innerHeight - rect.top + GAP };
  return createPortal(
    <div
      id={id}
      role="tooltip"
      style={style}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="fixed z-50 max-h-60 overflow-auto rounded-lg border border-border bg-bg-secondary p-3 text-sm text-text-primary shadow-lg"
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * Shows `children` beside a trigger on hover and focus, hides it on leave, blur and Escape.
 * It takes no focus and traps none; the trigger stays the only tab stop.
 */
function useReveal() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const show = useCallback(() => {
    cancel();
    setOpen(true);
  }, []);
  // A short delay lets the pointer cross the gap from the trigger into the preview.
  const hide = useCallback(() => {
    cancel();
    timer.current = setTimeout(() => setOpen(false), 120);
  }, []);
  const hideNow = useCallback(() => {
    cancel();
    setOpen(false);
  }, []);
  useEffect(() => cancel, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideNow();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hideNow]);
  return { open, show, hide, hideNow };
}

function EntryBody({ entry }: { entry: SpecIdEntry }) {
  return (
    <>
      <p className="font-semibold mb-1">
        <span className="font-mono text-text-secondary">{entry.id}</span> {entry.title}
      </p>
      {/* An empty provider: a citation inside a preview stays text, so previews cannot nest. */}
      <SpecIdIndexContext.Provider value={EMPTY_SPEC_ID_INDEX}>
        <MarkdownRenderer content={entry.text} />
      </SpecIdIndexContext.Provider>
    </>
  );
}

function RetiredBody({ retired, index }: { retired: RetiredEntry; index: SpecIdIndex }) {
  const replacement = retired.replacedBy ? index.entries[retired.replacedBy] : undefined;
  return (
    <>
      <p className="font-semibold mb-1">
        <span className="font-mono text-text-secondary">{retired.id}</span> is retired
        {retired.status ? <span className="text-text-secondary font-normal"> ({retired.status})</span> : null}
      </p>
      {retired.reason ? <p className="mb-2">{retired.reason}</p> : null}
      {retired.replacedBy ? (
        <p>
          Replaced by{" "}
          {replacement ? (
            <Link to={specIdTarget(replacement)} className={REF_CLASS}>
              [{retired.replacedBy}]
            </Link>
          ) : (
            <span className="font-mono">{retired.replacedBy}</span>
          )}
        </p>
      ) : null}
    </>
  );
}

/** One `[ID]` citation, as the link or the retired mark it resolves to. Unresolved ids never reach here. */
export function SpecIdRef({ id, label, resolved }: { id: string; label: string; resolved: NonNullable<Resolved> }) {
  const index = useSpecIdIndex();
  const reveal = useReveal();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const popId = useId();
  const handlers = {
    ref: setAnchorEl,
    onMouseEnter: reveal.show,
    onMouseLeave: reveal.hide,
    onFocus: reveal.show,
    onBlur: reveal.hideNow,
    "aria-describedby": reveal.open ? popId : undefined,
  };

  const trigger =
    resolved.kind === "entry" ? (
      <Link to={specIdTarget(resolved.entry)} className={REF_CLASS} onClick={reveal.hideNow} {...handlers}>
        {label}
      </Link>
    ) : (
      // Not a link — there is nowhere to go — but still a tab stop, so the reason is reachable by keyboard.
      <span tabIndex={0} className={RETIRED_CLASS} data-retired={id} {...handlers}>
        {label}
      </span>
    );

  return (
    <>
      {trigger}
      {reveal.open && anchorEl ? (
        <Preview id={popId} anchorEl={anchorEl} onEnter={reveal.show} onLeave={reveal.hide}>
          {resolved.kind === "entry" ? (
            <EntryBody entry={resolved.entry} />
          ) : (
            <RetiredBody retired={resolved.retired} index={index} />
          )}
        </Preview>
      ) : null}
    </>
  );
}
