import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(__dirname, "../../src/content/adr");
const files = readdirSync(dir, { withFileTypes: true }).filter(f => f.isFile() && f.name.endsWith(".mdx")).map(f => f.name);
const read = (f: string) => readFileSync(join(dir, f), "utf8");

test("ADR-001 and ADR-002 exist", () => {
  expect(files).toEqual(expect.arrayContaining(["001-data-portability.mdx", "002-sensitive-attributes.mdx"]));
});

test.each(files)("%s has the four required sections", f => {
  const body = read(f);
  for (const h of ["## Context", "## Options", "## Decision", "## Consequences"]) expect(body).toContain(h);
});

test("ADR numbers are unique", () => {
  const numbers = files.map(f => Number(/^number:\s*(\d+)/m.exec(read(f))?.[1]));
  expect(new Set(numbers).size).toBe(files.length);
});
