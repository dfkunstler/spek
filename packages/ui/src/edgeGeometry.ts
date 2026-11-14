// The drawn shape of a spec ↔ spec edge. Pure, so the sizes and curves a force layout produces at runtime
// can be asserted without a DOM — `@spekjs/ui`'s suite runs on plain `node --test`.

export interface Point {
  x: number;
  y: number;
}

/** How far a reference arc bows away from the straight line, as a fraction of the distance it spans. */
export const ARC_BOW = 0.18;

/** Between a reference's arrowhead and the rim of the node it points at. */
export const ARROW_GAP = 2;

/** A changed-together edge's stroke width: 1.5 at weight 1, growing by 0.75 a change, capped. */
export const WEIGHT_WIDTH_BASE = 1.5;
export const WEIGHT_WIDTH_STEP = 0.75;
export const WEIGHT_WIDTH_MAX = 6;

export function weightWidth(weight: number | undefined): number {
  const w = Number.isFinite(weight) && (weight as number) > 1 ? (weight as number) : 1;
  return Math.min(WEIGHT_WIDTH_MAX, WEIGHT_WIDTH_BASE + (w - 1) * WEIGHT_WIDTH_STEP);
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** A straight edge. A zero-length one is a point, not NaN. */
export function straightPath(s: Point, t: Point): string {
  return `M${fmt(s.x)},${fmt(s.y)}L${fmt(t.x)},${fmt(t.y)}`;
}

/**
 * A reference edge: a quadratic arc from `s`, ending `targetRadius + ARROW_GAP` short of `t`'s centre so the
 * arrowhead sits on the node's rim rather than under its fill.
 *
 * The bow is to the left of the direction of travel, so A→B and B→A bow to opposite sides: a mutual
 * reference is two lines, not one drawn twice, and so is a pair that has a reference *and* a
 * changed-together edge — the latter is straight.
 *
 * The end point lies on the line from the control point to `t`, so the path's end tangent — which an SVG
 * marker with `orient="auto"` follows — points at the node's centre.
 */
export function arcPath(s: Point, t: Point, targetRadius: number): string {
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return straightPath(s, t);

  const control = {
    x: (s.x + t.x) / 2 + (dy / dist) * dist * ARC_BOW,
    y: (s.y + t.y) / 2 - (dx / dist) * dist * ARC_BOW,
  };
  const cx = t.x - control.x;
  const cy = t.y - control.y;
  const cd = Math.hypot(cx, cy);
  const back = targetRadius + ARROW_GAP;
  // Nodes overlapping so far that the arrow would pass its own start: draw to the centre instead.
  const end =
    cd > back ? { x: t.x - (cx / cd) * back, y: t.y - (cy / cd) * back } : { x: t.x, y: t.y };
  return `M${fmt(s.x)},${fmt(s.y)}Q${fmt(control.x)},${fmt(control.y)} ${fmt(end.x)},${fmt(end.y)}`;
}
