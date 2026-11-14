import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arcPath,
  ARROW_GAP,
  straightPath,
  weightWidth,
  WEIGHT_WIDTH_MAX,
} from "../edgeGeometry.js";

function endOf(d: string): { x: number; y: number } {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return { x: nums[nums.length - 2], y: nums[nums.length - 1] };
}
function controlOf(d: string): { x: number; y: number } {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return { x: nums[2], y: nums[3] };
}

test("weight sets the stroke width: heavier is thicker, up to a cap", () => {
  assert.ok(weightWidth(2) < weightWidth(6));
  assert.ok(weightWidth(1) < weightWidth(2));
  assert.equal(weightWidth(1000), WEIGHT_WIDTH_MAX);
});

test("a missing, zero or non-finite weight draws as weight 1, never NaN", () => {
  for (const w of [undefined, 0, -3, NaN, Infinity]) {
    const width = weightWidth(w as number | undefined);
    assert.ok(Number.isFinite(width), String(w));
    assert.ok(width > 0 && width <= WEIGHT_WIDTH_MAX, String(w));
  }
});

test("a reference ends on the rim of its target, not at its centre", () => {
  const end = endOf(arcPath({ x: 0, y: 0 }, { x: 200, y: 0 }, 20));
  const toCentre = Math.hypot(200 - end.x, 0 - end.y);
  assert.ok(Math.abs(toCentre - (20 + ARROW_GAP)) < 0.5, `ends ${toCentre} from the centre`);
});

test("the end tangent points at the target's centre", () => {
  const t = { x: 120, y: 80 };
  const d = arcPath({ x: 10, y: 10 }, t, 25);
  const c = controlOf(d);
  const e = endOf(d);
  // control → end and end → centre are parallel (cross product ≈ 0).
  const cross = (e.x - c.x) * (t.y - e.y) - (e.y - c.y) * (t.x - e.x);
  assert.ok(Math.abs(cross) < 5, `cross product ${cross}`);
});

test("A→B and B→A bow to opposite sides", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 200, y: 0 };
  const forward = controlOf(arcPath(a, b, 20));
  const back = controlOf(arcPath(b, a, 20));
  assert.ok(forward.y * back.y < 0, `controls at y=${forward.y} and y=${back.y}`);
});

test("a reference does not coincide with the straight changed-together edge of the same pair", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 200, y: 0 };
  assert.notEqual(Math.abs(controlOf(arcPath(a, b, 20)).y), 0);
  assert.match(straightPath(a, b), /^M0,0L200,0$/);
});

test("coincident nodes give a point, not NaN", () => {
  const d = arcPath({ x: 5, y: 5 }, { x: 5, y: 5 }, 20);
  assert.ok(!d.includes("NaN"));
});

test("nodes overlapping within the arrow's reach draw to the centre rather than backwards", () => {
  const d = arcPath({ x: 0, y: 0 }, { x: 10, y: 0 }, 45);
  assert.ok(!d.includes("NaN"));
  assert.deepEqual(endOf(d), { x: 10, y: 0 });
});
