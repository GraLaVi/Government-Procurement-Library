#!/usr/bin/env node
/**
 * Theme-class linter.
 *
 * Catches the two failure modes that a type-checker and ESLint can't see,
 * because to them a className is just a string:
 *
 *   1. DEAD TOKENS — `bg-destructive`, `text-muted-foreground` and friends.
 *      Tailwind silently generates nothing for a token that isn't in the
 *      @theme block, so the element renders with no styling at all and looks
 *      merely plain rather than broken. This shipped once: the
 *      /library/code-definitions error banner had no red on it for months.
 *
 *   2. LIGHT-ONLY COLORS — a hardcoded `bg-white` or a `-100`-tint chip with
 *      no dark counterpart on the same line, which is how a white card ends
 *      up under themed text in dark mode.
 *
 * The valid token list is PARSED from globals.css rather than duplicated
 * here, so adding a token to the theme automatically teaches this script
 * about it. Deliberate exceptions carry `theme-ok` in a comment on the same
 * line or the line above, with the reason.
 *
 * Usage: node scripts/check-theme-classes.mjs [--list-tokens]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const GLOBALS = join(SRC, "app", "globals.css");

// Utilities that take a color token in this codebase.
const PREFIXES = String.raw`bg|text|border|ring|fill|stroke|divide|placeholder|from|via|to|shadow|outline|accent|caret`;

/** Color tokens declared in the `@theme inline` block: --color-<name>. */
function readThemeTokens() {
  const css = readFileSync(GLOBALS, "utf8");
  const tokens = new Set();
  for (const m of css.matchAll(/--color-([a-z0-9-]+):/g)) tokens.add(m[1]);
  if (tokens.size === 0) {
    throw new Error(`No --color-* tokens found in ${GLOBALS}; has the theme block moved?`);
  }
  return tokens;
}

/**
 * Tailwind's own palette plus the keywords that are always valid. A class is
 * only reported as a dead token when it looks like a token reference and
 * matches neither the theme nor this list.
 */
const TAILWIND_PALETTE = new Set([
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet",
  "purple", "fuchsia", "pink", "rose", "white", "black", "transparent", "current",
  "inherit", "none", "auto",
]);

/** Light-only classes that are correct as written; each needs a `theme-ok`. */
const LIGHT_ONLY = new RegExp(
  String.raw`\b(bg-white\b|bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200)\b)`,
);

const DEAD_TOKEN = new RegExp(String.raw`\b(?:${PREFIXES})-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\b`, "g");

/**
 * Non-color values these same prefixes accept. Without this, `border-t`,
 * `divide-y` and `bg-gradient-to-r` all look like color tokens.
 */
const NOT_A_COLOR = new Set([
  // sides and axes: border-t, divide-y, rounded-b …
  "t", "b", "l", "r", "x", "y", "s", "e",
  // border/divide styles
  "solid", "dashed", "dotted", "double", "hidden", "none", "collapse", "separate",
  // text utilities
  "left", "center", "right", "justify", "start", "end", "wrap", "nowrap",
  "ellipsis", "clip", "balance", "pretty", "opacity",
  "xs", "sm", "md", "lg", "xl", "base", "inner",
  // background utilities
  "cover", "contain", "fixed", "local", "scroll", "repeat", "no", "auto", "bottom", "top",
]);

/**
 * When the first segment is one of these, the whole utility is about
 * something other than color — `bg-gradient-to-br`, `ring-offset-2`,
 * `bg-clip-text` — so nothing after it is a token reference.
 */
const NON_COLOR_HEADS = new Set(["gradient", "offset", "opacity", "clip"]);

/** Strip side/axis prefixes so `border-t-primary` tests as `primary`. */
function colorPartOf(name) {
  const parts = name.split("-");
  while (parts.length > 1 && NOT_A_COLOR.has(parts[0])) parts.shift();
  return parts.join("-");
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * `theme-ok` on this line or any of the 3 above waives it. The window is 3
 * rather than 1 because the class is often inside a multi-line template
 * literal, where a comment would become part of the class string — the
 * waiver has to sit above the `className={` that opens it.
 */
function waived(lines, i) {
  for (let k = Math.max(0, i - 3); k <= i; k++) {
    if (/theme-ok/.test(lines[k])) return true;
  }
  return false;
}

const tokens = readThemeTokens();

if (process.argv.includes("--list-tokens")) {
  console.log([...tokens].sort().join("\n"));
  process.exit(0);
}

const problems = [];

for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");
  // A whole file may be a deliberately fixed-palette surface — a landing
  // section painted on brand color, say. This waives the light-only check
  // only; a dead token is a bug on any surface, so it is never waived.
  const fileIsFixedPalette = /theme-ok-file/.test(source);

  lines.forEach((line, i) => {
    if (waived(lines, i)) return;

    // 1. dead tokens — only inspect strings that plausibly hold classes
    if (/class(Name)?\s*[=:]|["'`][^"'`]*\b(?:bg|text|border)-/.test(line)) {
      for (const m of line.matchAll(DEAD_TOKEN)) {
        // Strip side/axis prefixes, then a trailing numeric shade
        // (border-t-blue-500 → blue), to test the hue itself.
        if (NON_COLOR_HEADS.has(m[1].split("-")[0])) continue;
        const name = colorPartOf(m[1]);
        const base = name.replace(/-(?:\d{2,3})$/, "");
        if (!name || NOT_A_COLOR.has(base) || /^\d/.test(base)) continue;
        if (tokens.has(name) || tokens.has(base)) continue;
        if (TAILWIND_PALETTE.has(base.split("-")[0])) continue;
        if (/^\[/.test(name)) continue; // arbitrary value: bg-[#0F1D2F]
        problems.push({ file, line: i + 1, kind: "dead token", detail: m[0] });
      }
    }

    // 2. light-only colors with no dark counterpart on the same line
    if (fileIsFixedPalette) return;
    const lightOnly = line.match(LIGHT_ONLY);
    if (lightOnly && !/\bdark:/.test(line)) {
      problems.push({ file, line: i + 1, kind: "light-only", detail: lightOnly[1] });
    }
  });
}

if (problems.length === 0) {
  console.log(`theme-classes: clean (${tokens.size} tokens known)`);
  process.exit(0);
}

console.error(`theme-classes: ${problems.length} problem(s)\n`);
for (const p of problems) {
  console.error(`  ${relative(ROOT, p.file)}:${p.line}  ${p.kind}: ${p.detail}`);
}
console.error(
  "\nDead tokens render as NO styling at all — check the name against " +
  "`node scripts/check-theme-classes.mjs --list-tokens`.\n" +
  "Light-only colors need a dark: counterpart on the same line, or a " +
  "`theme-ok <reason>` comment when the light value is deliberate " +
  "(a white knob on a colored track, a fixed brand panel).",
);
process.exit(1);
