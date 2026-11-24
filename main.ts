// Two Days of Quiet Dread
//
// A tiny program with exactly one job:
//   write a single pull-request review comment to entry.txt.
//
// The comment has to do two things at once:
//   1. Read like a genuine review approval.
//      "LGTM", "Approved", "Ship it" energy — a reviewer
//      who actually looked at the diff and means it.
//   2. Carry a soft undercurrent of existential dread.
//      Not horror. Not a punchline. Just the quiet sense
//      that the code, the team, and everything around
//      them are temporary, and that shipping anyway
//      is the only honest response.
//
// The gate for this bounty is strict about shape:
//   - UTF-8 text
//   - 1 to 140 characters
//   - not only whitespace
//   - exactly one line
//
// So this program validates its own comment before it
// writes anything, writes the file, then reads the file
// back and verifies that what landed on disk matches
// the constant byte for byte (as text). If any check
// fails, it throws and writes nothing trustworthy.
//
// Runtime: Node 22, standard library only.
// Usage:
//   MAKEFUN_OUTPUT_DIR=/tmp/dread2-out node main.ts
//
// When MAKEFUN_OUTPUT_DIR is not set, the output
// directory defaults to "/output", which is where
// the make.fun runner expects entry.txt to appear.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The one and only review comment this program holds.
// There is deliberately no list of candidates, no
// scorer, and no ranking machinery: picking the line
// was the human work, and it happened before this
// file was written. What remains is delivery.
const COMMENT =
  "Approved. Ship it before the heat death, before the backlog eats us, before anyone asks why — today, this code is enough.";

// Shape limits for the entry file.
const MAX_LENGTH = 140;
const MIN_LENGTH = 1;

// Fail loudly with a clear message. A bad entry that
// slips through quietly is worse than a crash, because
// the crash at least tells someone to fix the line.
function fail(message: string): never {
  throw new Error(message);
}

// The comment must be exactly one line. A stray "\n"
// or "\r" would turn entry.txt into two lines and
// fail the gate, so reject both characters outright.
function assertSingleLine(value: string): void {
  if (value.includes("\n") || value.includes("\r")) {
    fail("comment must be a single line");
  }
}

// A whitespace-only file is not an entry. Reject the
// empty string and anything that trims down to it.
function assertNonBlank(value: string): void {
  if (value.trim().length === 0) {
    fail("comment must not be blank");
  }
}

// The length gate is measured in characters, the way
// a reader counts them, and the ceiling is 140.
function assertWithinLimit(value: string): void {
  const count = [...value].length;
  if (count < MIN_LENGTH) {
    fail("comment is too short");
  }
  if (count > MAX_LENGTH) {
    fail(`comment is ${count} characters; limit is ${MAX_LENGTH}`);
  }
}

// Leading or trailing whitespace is invisible in a
// review UI and sloppy on disk. The line should start
// with its first real character and end with its last.
function assertTrimmed(value: string): void {
  if (value !== value.trim()) {
    fail("comment must not have leading or trailing whitespace");
  }
}

// Invisible control characters would survive a casual
// read of the file while corrupting how it renders in
// a review UI, so reject them explicitly — the line
// should contain only characters a reviewer can see.
function assertNoControlCharacters(value: string): void {
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) {
      fail("comment must not contain control characters");
    }
  }
}

// Run every shape check, in an order that reports the
// most structural problems (line breaks, blankness)
// before the more cosmetic ones (padding, length).
function validateComment(value: string): void {
  assertSingleLine(value);
  assertNoControlCharacters(value);
  assertNonBlank(value);
  assertTrimmed(value);
  assertWithinLimit(value);
}

// Resolve where entry.txt belongs. The environment
// variable wins; the runner default is the fallback.
function resolveOutputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv !== undefined && fromEnv.trim() !== "") {
    return fromEnv;
  }
  return "/output";
}

// Write the comment exactly as held — no trailing
// newline is added, because the file itself is meant
// to be the single line and nothing more.
function writeEntry(dir: string, value: string): string {
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "entry.txt");
  writeFileSync(filePath, value, "utf8");
  return filePath;
}

// Read the written file back and demand an exact
// match. If the disk disagrees with the constant,
// something is deeply wrong and we should say so.
function verifyEntry(filePath: string, expected: string): void {
  const actual = readFileSync(filePath, "utf8");
  if (actual !== expected) {
    fail(`entry.txt mismatch: wrote ${expected.length}, read ${actual.length}`);
  }
}

// Entry point: validate, write, verify, report.
// The report prints the line itself and its character
// count so a human skimming the log can see exactly
// what was submitted and that it fits the gate.
function main(): void {
  validateComment(COMMENT);
  const outputDir = resolveOutputDir();
  const filePath = writeEntry(outputDir, COMMENT);
  verifyEntry(filePath, COMMENT);
  const count = [...COMMENT].length;
  console.log(COMMENT);
  console.log(`characters: ${count}`);
  console.log(`written to: ${filePath}`);
}

main();
