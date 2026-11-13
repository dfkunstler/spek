import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { SpecIdIndex } from "@spekjs/core/spec-ids";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { SpecIdRef } from "./SpecIdRef";
import { SpecIdIndexContext } from "../contexts/SpecIdIndexContext";

// `[ID]` citations in spec text (spec-id-references). The popover is portalled and opens on pointer or
// focus, so static markup can pin only what is there before either — which is itself a requirement:
// nothing of the preview is rendered until it is asked for.

const INDEX: SpecIdIndex = {
  entries: {
    "BMB-003": {
      id: "BMB-003", kind: "requirement", topic: "backmatter-builders", source: "main",
      anchor: "requirement-bmb-003-build-a-resource", title: "Build a resource", text: "The builder SHALL build.",
    },
    "BMB-003.01": {
      id: "BMB-003.01", kind: "scenario", topic: "backmatter-builders", source: "main",
      anchor: "requirement-bmb-003-build-a-resource", title: "Generated identifier", text: "- **WHEN** a\n- **THEN** b",
    },
    "PRS-015": {
      id: "PRS-015", kind: "requirement", topic: "document-parsing", source: "change",
      anchor: "requirement-prs-015-new", title: "New", text: "New.",
    },
  },
  retired: {
    "MDL-004": { id: "MDL-004", reason: "Moved.", replacedBy: "BMB-003" },
    "FAC-001.02": { id: "FAC-001.02", reason: "Gone." },
  },
};

const render = (content: string, index?: SpecIdIndex): string => {
  const md = createElement(MarkdownRenderer, { content, specShaped: true });
  const tree: ReactElement = index ? createElement(SpecIdIndexContext.Provider, { value: index }, md) : md;
  return renderToStaticMarkup(createElement(MemoryRouter, null, tree));
};

test("a citation of a declared requirement becomes an in-app link to its anchor", () => {
  const html = render("The builder uses [BMB-003] first.", INDEX);
  assert.match(html, /<a [^>]*href="\/specs\/backmatter-builders#requirement-bmb-003-build-a-resource"[^>]*>\[BMB-003\]<\/a>/);
});

test("a citation of a scenario links to its requirement's anchor", () => {
  assert.match(render("See [BMB-003.01].", INDEX), /href="\/specs\/backmatter-builders#requirement-bmb-003-build-a-resource"/);
});

test("a delta target stays on the page, under the topic prefix the Specs tab gives its headings", () => {
  assert.match(render("See [PRS-015].", INDEX), /href="[^"]*#document-parsing--requirement-prs-015-new"/);
});

test("an existing relative link to a declared identifier goes to the requirement in the app", () => {
  const html = render("See [BMB-003](../backmatter-builders/spec.md).", INDEX);
  assert.match(html, /href="\/specs\/backmatter-builders#requirement-bmb-003-build-a-resource"/);
  assert.ok(!html.includes("../backmatter-builders"));
  assert.ok(!html.includes('target="_blank"'));
});

test("an unknown label is left as written", () => {
  const html = render("A [TODO-123] note and [BMB-999].", INDEX);
  assert.match(html.replace(/<[^>]+>/g, ""), /A \[TODO-123\] note and \[BMB-999\]\./);
  assert.ok(!html.includes("<a "));
});

test("a retired citation is a focusable mark with no href", () => {
  const html = render("Was [MDL-004] once.", INDEX);
  assert.match(html, /<span[^>]*tabindex="0"[^>]*data-retired="MDL-004"[^>]*>\[MDL-004\]<\/span>/);
  assert.ok(!html.includes("href="));
});

test("the preview renders nothing until it is opened", () => {
  const html = render("See [BMB-003].", INDEX);
  assert.ok(!html.includes('role="tooltip"'));
  assert.ok(!html.includes("The builder SHALL build."));
  assert.ok(!html.includes("aria-describedby"));
});

test("headings and code are never linked", () => {
  const html = render("### Requirement: [BMB-003] Title\n\nInline `[BMB-003]` code.\n\n```\n[BMB-003]\n```\n", INDEX);
  assert.ok(!html.includes('href="/specs/backmatter-builders'));
});

test("a bold citation is linked, and one inside a bold heading is not", () => {
  assert.match(render("**[BMB-003]**", INDEX), /href="\/specs\/backmatter-builders#/);
  assert.ok(!render("## **[BMB-003]**", INDEX).includes('href="/specs/backmatter-builders'));
});

test("no index provided: the markup is exactly what it was", () => {
  assert.equal(render("See [BMB-003]."), render("See [BMB-003].", { entries: {}, retired: {} }));
  assert.ok(!render("See [BMB-003].").includes("<a "));
});

test("the SpecIdRef trigger carries no popover attributes while closed", () => {
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(SpecIdRef, { id: "BMB-003", label: "[BMB-003]", resolved: { kind: "entry", entry: INDEX.entries["BMB-003"] } }),
    ),
  );
  assert.ok(!html.includes("aria-describedby"));
});
